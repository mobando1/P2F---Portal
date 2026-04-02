import type { Express } from "express";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { storage } from "../storage";
import { notificationService } from "../services/notification";
import { gamificationService } from "../services/gamification";
import { learningPathService } from "../services/learning-path";
import { requireTutor } from "./auth";

export function registerTutorPortalRoutes(app: Express) {
  // Helper to get tutor profile from logged-in user
  async function getTutorFromUser(userId: number) {
    return await storage.getTutorByUserId(userId);
  }

  // Dashboard stats
  app.get("/api/tutor/dashboard", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);

      if (!tutor) {
        return res.status(404).json({ message: "Tutor profile not found" });
      }

      // Parallel fetch: classes + assignments at the same time
      const [tutorClasses, allAssignments] = await Promise.all([
        storage.getClassesByTutor(tutor.id),
        storage.getAssignmentsByTutor(tutor.id),
      ]);

      const now = new Date();
      const scheduled = tutorClasses.filter(c => c.status === "scheduled" && new Date(c.scheduledAt) > now);
      const completed = tutorClasses.filter(c => c.status === "completed");
      const today = tutorClasses.filter(c => {
        const d = new Date(c.scheduledAt);
        return c.status === "scheduled" && d.toDateString() === now.toDateString();
      });

      const classesWithoutNotes = completed.filter(c => !c.sessionNotes).length;
      const pendingAssignments = allAssignments.filter(a => a.status === "assigned").length;

      // Batch fetch students for upcoming classes (single query instead of N queries)
      const upcomingSorted = scheduled
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 10);

      const studentIds = Array.from(new Set(upcomingSorted.map(c => c.userId)));
      const students = studentIds.length > 0 ? await storage.getUsersByIds(studentIds) : [];
      const studentMap = new Map(students.map(s => [s.id, s]));

      const upcomingWithStudents = upcomingSorted.map(c => {
        const student = studentMap.get(c.userId);
        return {
          ...c,
          studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          studentEmail: student?.email || "",
        };
      });

      res.json({
        tutor: {
          id: tutor.id,
          name: tutor.name,
          rating: tutor.rating,
          reviewCount: tutor.reviewCount,
        },
        stats: {
          todaysClasses: today.length,
          upcomingClasses: scheduled.length,
          completedClasses: completed.length,
          totalHours: completed.reduce((sum, c) => sum + (c.duration || 60), 0) / 60,
          classesWithoutNotes,
          pendingAssignments,
        },
        upcomingClasses: upcomingWithStudents,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Prep cards for upcoming classes — enriched student context
  app.get("/api/tutor/prep", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const upcoming = tutorClasses
        .filter(c => c.status === "scheduled" && new Date(c.scheduledAt) > now && new Date(c.scheduledAt) <= in48h)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 5);

      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Batch fetch all students for upcoming classes (1 query instead of N)
      const studentIds = Array.from(new Set(upcoming.map(c => c.userId)));
      const students = studentIds.length > 0 ? await storage.getUsersByIds(studentIds) : [];
      const studentMap = new Map(students.map(s => [s.id, s]));

      // Process each prep card with parallel sub-queries per student
      const prepCards = await Promise.all(upcoming.map(async (c) => {
        const student = studentMap.get(c.userId);
        if (!student) return null;

        // Last completed class with notes (from already-fetched tutorClasses)
        const lastClass = tutorClasses
          .filter(sc => sc.userId === student.id && sc.status === "completed")
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0] || null;

        // Parallel: student progress, AI conversations, assignments
        const [pathProgress, aiConvs, assignments] = await Promise.all([
          storage.getStudentProgress(student.id),
          storage.getAiConversations(student.id),
          storage.getAssignmentsForStudent(student.id),
        ]);

        // Current station
        let currentStation = null;
        const inProgress = pathProgress
          .filter(p => p.status === "in_progress")
          .sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime())[0];
        if (inProgress) {
          const stations = await storage.getStationsByLevel(student.level);
          const st = stations.find(s => s.id === inProgress.stationId);
          if (st) currentStation = { title: st.title, level: st.level, order: st.stationOrder };
        }

        const aiThisWeek = aiConvs.filter(c => c.updatedAt && new Date(c.updatedAt) >= oneWeekAgo).length;
        const pendingHomework = assignments.filter(a => a.status === "assigned" && a.tutorId === tutor.id);

        return {
          classId: c.id,
          scheduledAt: c.scheduledAt,
          duration: c.duration,
          meetingLink: c.meetingLink,
          student: {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            level: student.level,
          },
          currentStation,
          lastClass: lastClass ? {
            scheduledAt: lastClass.scheduledAt,
            sessionNotes: lastClass.sessionNotes,
            sharedNotes: lastClass.sharedNotes,
            homeworkText: lastClass.homeworkText,
          } : null,
          aiThisWeek,
          pendingAssignments: pendingHomework.length,
        };
      }));

      res.json(prepCards.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all classes for this tutor
  app.get("/api/tutor/classes", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const tutorClasses = (await storage.getClassesByTutor(tutor.id))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      // Batch fetch students (1 query instead of N)
      const classStudentIds = Array.from(new Set(tutorClasses.map(c => c.userId)));
      const classStudents = classStudentIds.length > 0 ? await storage.getUsersByIds(classStudentIds) : [];
      const classStudentMap = new Map(classStudents.map(s => [s.id, s]));

      const enriched = tutorClasses.map(c => {
        const student = classStudentMap.get(c.userId);
        return {
          ...c,
          studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor's availability settings
  app.get("/api/tutor/availability", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const availability = await storage.getTutorAvailability(tutor.id);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Weekly availability view — returns 7 days with 30-min slots showing availability, bookings, and blocks
  app.get("/api/tutor/availability/week", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const startDateStr = req.query.startDate as string;
      const weekStart = startDateStr ? new Date(startDateStr) : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday as start
        const mon = new Date(now);
        mon.setDate(now.getDate() + diff);
        mon.setHours(0, 0, 0, 0);
        return mon;
      })();

      // Fetch recurring slots, classes, and exceptions in parallel
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [recurringSlots, tutorClasses, exceptions] = await Promise.all([
        storage.getTutorAvailability(tutor.id),
        storage.getClassesByTutor(tutor.id),
        storage.getTutorExceptions ? storage.getTutorExceptions(tutor.id, weekStart, weekEnd) : Promise.resolve([]),
      ]);

      // Get student names for booked classes
      const classStudentIds = Array.from(new Set(tutorClasses.map(c => c.userId)));
      const students = classStudentIds.length > 0 ? await storage.getUsersByIds(classStudentIds) : [];
      const studentMap = new Map(students.map(s => [s.id, s]));

      const SLOT_START_HOUR = 6;
      const SLOT_END_HOUR = 22;
      const SLOT_MINUTES = 30;

      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const dayOfWeek = date.getDay(); // 0=Sun...6=Sat

        // Find recurring slots for this day
        const daySlots = recurringSlots.filter(s => s.dayOfWeek === dayOfWeek);

        // Find booked classes for this day
        const dayClasses = tutorClasses.filter(c => {
          if (c.status === "cancelled") return false;
          const classDate = new Date(c.scheduledAt);
          return classDate.toISOString().split("T")[0] === dateStr;
        });

        // Find exceptions for this day
        const dayExceptions = (exceptions as any[]).filter((e: any) => {
          const exDate = new Date(e.date);
          return exDate.toISOString().split("T")[0] === dateStr;
        });

        const slots = [];
        for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
          for (let m = 0; m < 60; m += SLOT_MINUTES) {
            const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            const slotStart = h * 60 + m;
            const slotEnd = slotStart + SLOT_MINUTES;

            // Check if within recurring availability
            const isAvailable = daySlots.some(s => {
              const [sh, sm] = (s.startTime || "00:00").split(":").map(Number);
              const [eh, em] = (s.endTime || "00:00").split(":").map(Number);
              return slotStart >= sh * 60 + sm && slotEnd <= eh * 60 + em;
            });

            // Check if booked
            const bookedClass = dayClasses.find(c => {
              const classTime = new Date(c.scheduledAt);
              const classStart = classTime.getHours() * 60 + classTime.getMinutes();
              const classEnd = classStart + (c.duration || 60);
              return slotStart >= classStart && slotStart < classEnd;
            });

            // Check if blocked by exception
            const isBlocked = dayExceptions.some((e: any) => {
              if (!e.startTime && !e.endTime) return true; // full day block
              const [esh, esm] = (e.startTime || "00:00").split(":").map(Number);
              const [eeh, eem] = (e.endTime || "23:59").split(":").map(Number);
              return slotStart >= esh * 60 + esm && slotStart < eeh * 60 + eem;
            });

            let classInfo: string | undefined;
            if (bookedClass) {
              const student = studentMap.get(bookedClass.userId);
              classInfo = student ? `${student.firstName} ${student.lastName.charAt(0)}.` : "Student";
              classInfo += ` · ${bookedClass.duration || 60}min`;
            }

            slots.push({
              hour: h,
              minute: m,
              time: timeStr,
              available: isAvailable && !isBlocked && !bookedClass,
              isRecurring: isAvailable,
              booked: !!bookedClass,
              blocked: isBlocked,
              classInfo,
            });
          }
        }

        days.push({
          date: dateStr,
          dayOfWeek,
          slots,
        });
      }

      res.json({
        weekStart: weekStart.toISOString().split("T")[0],
        days,
        recurringSlots,
      });
    } catch (error) {
      console.error("[tutor/availability/week] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update tutor's availability
  app.put("/api/tutor/availability", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const { slots } = req.body;
      if (!Array.isArray(slots)) {
        return res.status(400).json({ message: "slots must be an array" });
      }

      const result = await storage.setTutorAvailability(tutor.id, slots);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add availability exception (vacation, blocked day)
  app.post("/api/tutor/availability/exception", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const { date, isBlocked, startTime, endTime, reason } = req.body;
      if (!date) return res.status(400).json({ message: "date is required" });

      const exception = await storage.createTutorException({
        tutorId: tutor.id,
        date: new Date(date),
        isBlocked: isBlocked !== false,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
      });

      res.status(201).json(exception);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete availability exception (with ownership check)
  app.delete("/api/tutor/availability/exception/:id", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTutorException(id, tutor.id);
      if (!deleted) return res.status(404).json({ message: "Exception not found or not yours" });
      res.json({ message: "Exception deleted" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark class as completed (optionally with session notes)
  app.put("/api/tutor/classes/:id/complete", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const classId = parseInt(req.params.id);
      const allClasses = await storage.getClassesByTutor(tutor.id);
      const classItem = allClasses.find(c => c.id === classId);

      if (!classItem) return res.status(404).json({ message: "Class not found" });
      if (classItem.status !== "scheduled") return res.status(400).json({ message: "Class is not scheduled" });

      const { sessionNotes, sharedNotes, homeworkText, topicsCovered } = req.body || {};

      // Atomic: only completes if still scheduled
      const updated = await storage.completeClassIfScheduled(classId, {
        sessionNotes: sessionNotes || undefined,
        sharedNotes: sharedNotes || undefined,
        homeworkText: homeworkText || undefined,
        topicsCovered: Array.isArray(topicsCovered) ? topicsCovered : undefined,
      });
      if (!updated) return res.status(400).json({ message: "Class could not be completed" });

      // Update student progress
      const progress = await storage.getUserProgress(classItem.userId);
      await storage.updateUserProgress(classItem.userId, {
        classesCompleted: (progress?.classesCompleted || 0) + 1,
        learningHours: String(parseFloat(progress?.learningHours || "0") + (classItem.duration || 60) / 60),
      });

      // Notify student
      notificationService.onClassCompleted({
        studentId: classItem.userId,
        tutorId: tutor.id,
        scheduledAt: new Date(classItem.scheduledAt),
      });

      // Check gamification milestones
      gamificationService.onClassCompleted(classItem.userId);

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update session notes for a completed class
  app.patch("/api/tutor/classes/:id/notes", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const classId = parseInt(req.params.id);
      const allClasses = await storage.getClassesByTutor(tutor.id);
      const classItem = allClasses.find(c => c.id === classId);
      if (!classItem) return res.status(404).json({ message: "Class not found" });

      const { sessionNotes, sharedNotes, homeworkText, topicsCovered } = req.body || {};
      const updated = await storage.updateClassNotes(classId, {
        sessionNotes: sessionNotes ?? undefined,
        sharedNotes: sharedNotes ?? undefined,
        homeworkText: homeworkText ?? undefined,
        topicsCovered: Array.isArray(topicsCovered) ? topicsCovered : undefined,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor's students
  app.get("/api/tutor/students", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const tutorClasses = await storage.getClassesByTutor(tutor.id);

      // Get unique student IDs and batch fetch (1 query instead of N)
      const studentIds = Array.from(new Set(tutorClasses.map(c => c.userId)));
      const allStudents = studentIds.length > 0 ? await storage.getUsersByIds(studentIds) : [];
      const studentMap = new Map(allStudents.map(s => [s.id, s]));

      const students = studentIds.map(studentId => {
        const student = studentMap.get(studentId);
        const studentClasses = tutorClasses.filter(c => c.userId === studentId);
        const completed = studentClasses.filter(c => c.status === "completed");
        const lastClass = studentClasses
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

        return {
          id: studentId,
          name: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          email: student?.email || "",
          level: student?.level || "A1",
          profileImage: student?.profileImage || null,
          totalClasses: studentClasses.length,
          completedClasses: completed.length,
          lastClassDate: lastClass?.scheduledAt || null,
        };
      });

      res.json(students.sort((a, b) => b.totalClasses - a.totalClasses));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change a student's CEFR level (tutor manual override)
  app.put("/api/tutor/students/:studentId/level", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const studentId = parseInt(req.params.studentId);
      const { level } = req.body;
      const validLevels = ["A1", "A2", "B1", "B2"];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ message: "Invalid level. Must be A1, A2, B1, or B2." });
      }

      // Verify this is actually the tutor's student
      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const isMyStudent = tutorClasses.some(c => c.userId === studentId);
      if (!isMyStudent) return res.status(403).json({ message: "Not your student" });

      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const oldLevel = student.level;
      if (oldLevel === level) return res.json({ message: "Level unchanged", level });

      // Update level
      await storage.updateUser(studentId, { level });

      // Initialize learning path for new level
      await learningPathService.initializeStudentPath(studentId, level);

      // Notify student
      await storage.createNotification({
        userId: studentId,
        type: "system",
        title: `Nivel actualizado: ${level}`,
        message: `Tu tutor ${tutor.name} ha actualizado tu nivel de ${oldLevel} a ${level}.`,
        link: "/learning-path",
      });

      res.json({ message: "Level updated", oldLevel, newLevel: level });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get detailed student progress (level, path progress, quiz scores)
  app.get("/api/tutor/students/:studentId/progress", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const studentId = parseInt(req.params.studentId);

      // Verify this is the tutor's student
      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const isMyStudent = tutorClasses.some(c => c.userId === studentId);
      if (!isMyStudent) return res.status(403).json({ message: "Not your student" });

      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const progress = await storage.getUserProgress(studentId);
      const pathProgress = await storage.getStudentProgress(studentId);
      const quizAttempts = await storage.getQuizAttemptsByUser(studentId);

      // Calculate stats
      const completedStations = pathProgress.filter(p => p.status === "completed").length;
      const totalStations = pathProgress.length;
      const quizAvg = quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + Math.round((a.score / a.maxScore) * 100), 0) / quizAttempts.length)
        : 0;

      // Check advancement proximity
      const currentLevel = student.level;
      const rules = await storage.getLevelRules(currentLevel);
      let advancementProgress = null;
      if (rules) {
        const classesNeeded = rules.requiredClassesCompleted;
        const stationsNeeded = rules.requiredStationsCompleted;
        const quizScoreNeeded = rules.requiredQuizAvgScore;

        const levelStations = await storage.getStationsByLevel(currentLevel);
        const levelStationIds = new Set(levelStations.map(s => s.id));
        const completedInLevel = pathProgress.filter(
          p => levelStationIds.has(p.stationId) && p.status === "completed"
        ).length;

        advancementProgress = {
          toLevel: rules.toLevel,
          classes: { current: progress?.classesCompleted || 0, required: classesNeeded },
          stations: { current: completedInLevel, required: stationsNeeded },
          quizAvg: { current: quizAvg, required: quizScoreNeeded },
          isReady: (progress?.classesCompleted || 0) >= classesNeeded
            && completedInLevel >= stationsNeeded
            && quizAvg >= quizScoreNeeded,
        };
      }

      res.json({
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          level: student.level,
          profileImage: student.profileImage,
        },
        stats: {
          classesCompleted: progress?.classesCompleted || 0,
          learningHours: progress?.learningHours || "0",
          completedStations,
          totalStations,
          quizAvg,
          quizAttempts: quizAttempts.length,
        },
        advancementProgress,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor's earnings summary
  app.get("/api/tutor/earnings", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const completed = tutorClasses.filter(c => c.status === "completed");
      const hourlyRate = Number(tutor.hourlyRate) || 25;

      const totalHours = completed.reduce((sum, c) => sum + (c.duration || 60), 0) / 60;
      const totalEarnings = totalHours * hourlyRate;

      // Monthly breakdown (last 6 months)
      const now = new Date();
      const monthly: Array<{ month: string; classes: number; hours: number; earnings: number }> = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthClasses = completed.filter(c => {
          const cd = new Date(c.scheduledAt);
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
        });
        const monthHours = monthClasses.reduce((sum, c) => sum + (c.duration || 60), 0) / 60;
        monthly.push({
          month: monthKey,
          classes: monthClasses.length,
          hours: Math.round(monthHours * 10) / 10,
          earnings: Math.round(monthHours * Number(hourlyRate) * 100) / 100,
        });
      }

      res.json({
        hourlyRate,
        totalHours: Math.round(totalHours * 10) / 10,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalCompleted: completed.length,
        totalScheduled: tutorClasses.filter(c => c.status === "scheduled").length,
        monthly,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create assignment for a student (free-form or LP content)
  app.post("/api/tutor/students/:studentId/assignments", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const studentId = parseInt(req.params.studentId);

      // Verify this is the tutor's student
      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const isMyStudent = tutorClasses.some(c => c.userId === studentId);
      if (!isMyStudent) return res.status(403).json({ message: "Not your student" });

      const { assignmentType = "free_form", title, description, attachmentUrl, estimatedMinutes, contentId, stationId, dueDate, notes } = req.body;

      if (assignmentType === "free_form" && !title) {
        return res.status(400).json({ message: "title is required for free_form assignments" });
      }

      const assignment = await storage.createAssignment({
        tutorId: tutor.id,
        studentId,
        assignmentType,
        title: title || null,
        description: description || null,
        attachmentUrl: attachmentUrl || null,
        estimatedMinutes: estimatedMinutes || null,
        contentId: contentId || null,
        stationId: stationId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "assigned",
      });

      // Notify student
      await storage.createNotification({
        userId: studentId,
        type: "assignment",
        title: title || "Nueva tarea",
        message: description ? description.slice(0, 100) : "Tu tutor te ha asignado una nueva tarea.",
        link: "/learning-path",
      });

      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Student full timeline — classes with notes, quizzes, AI activity, assignments
  app.get("/api/tutor/students/:studentId/timeline", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const studentId = parseInt(req.params.studentId);

      // Verify this is the tutor's student
      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const isMyStudent = tutorClasses.some(c => c.userId === studentId);
      if (!isMyStudent) return res.status(403).json({ message: "Not your student" });

      const student = await storage.getUser(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      // Parallel data fetch
      const [pathProgress, quizAttempts, aiConversations, assignments, progress] = await Promise.all([
        storage.getStudentProgress(studentId),
        storage.getQuizAttemptsByUser(studentId),
        storage.getAiConversations(studentId),
        storage.getAssignmentsForStudent(studentId),
        storage.getUserProgress(studentId),
      ]);

      // Classes for this student by this tutor, sorted desc
      const studentClasses = tutorClasses
        .filter(c => c.userId === studentId)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      // Current station (in-progress or most recently started)
      const currentStation = pathProgress
        .filter(p => p.status === "in_progress")
        .sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime())[0] || null;

      let currentStationInfo = null;
      if (currentStation) {
        const stations = await storage.getStationsByLevel(student.level);
        const st = stations.find(s => s.id === currentStation.stationId);
        if (st) currentStationInfo = { id: st.id, title: st.title, level: st.level, order: st.stationOrder };
      }

      // Quiz stats
      const quizAvg = quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + Math.round((a.score / a.maxScore) * 100), 0) / quizAttempts.length)
        : 0;

      // AI activity
      const aiLastActivity = aiConversations[0]?.updatedAt || null;

      res.json({
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          level: student.level,
          classCredits: student.classCredits || 0,
        },
        stats: {
          classesCompleted: progress?.classesCompleted || 0,
          quizAvg,
          quizAttempts: quizAttempts.length,
          completedStations: pathProgress.filter(p => p.status === "completed").length,
          aiConversations: aiConversations.length,
          aiLastActivity,
          pendingAssignments: assignments.filter(a => a.status === "assigned").length,
        },
        currentStation: currentStationInfo,
        classes: studentClasses.slice(0, 20).map(c => ({
          id: c.id,
          title: c.title,
          scheduledAt: c.scheduledAt,
          status: c.status,
          duration: c.duration,
          sessionNotes: c.sessionNotes,
          sharedNotes: c.sharedNotes,
          homeworkText: c.homeworkText,
          topicsCovered: c.topicsCovered,
        })),
        assignments: assignments.slice(0, 10),
        recentQuizzes: quizAttempts
          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
          .slice(0, 5)
          .map(q => ({
            id: q.id,
            score: Math.round((q.score / q.maxScore) * 100),
            createdAt: q.createdAt,
          })),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor's own profile
  app.get("/api/tutor/profile", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });
      res.json(tutor);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update tutor's own profile
  app.put("/api/tutor/profile", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const { bio, phone, languages, certifications, avatar, yearsOfExperience } = req.body;

      // Validate avatar if provided
      if (avatar !== undefined && avatar !== null) {
        const dataUriMatch = (avatar as string).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
        if (!dataUriMatch) {
          return res.status(400).json({ message: "Invalid image format. Supported: JPEG, PNG, WebP, GIF" });
        }
        const base64Data = (avatar as string).split(",")[1];
        const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
        if (sizeBytes > 5 * 1024 * 1024) {
          return res.status(400).json({ message: "Image too large. Maximum 5MB" });
        }
      }

      const updated = await storage.updateTutor(tutor.id, {
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(languages !== undefined && { languages }),
        ...(certifications !== undefined && { certifications }),
        ...(avatar !== undefined && { avatar }),
        ...(yearsOfExperience !== undefined && { yearsOfExperience }),
      });

      // Sync avatar to users table for consistency
      if (avatar !== undefined && tutor.userId) {
        await storage.updateUser(tutor.userId, { avatar, profileImage: avatar });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor AI Assistant
  app.post("/api/tutor/ai-assistant", requireTutor, async (req, res) => {
    try {
      if (!config.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const { messages: chatMessages, lang } = req.body;
      if (!chatMessages || !Array.isArray(chatMessages)) {
        return res.status(400).json({ message: "messages array is required" });
      }

      const isEs = lang === "es";
      const systemPrompt = isEs
        ? `Eres un asistente de enseñanza para profesores de Passport2Fluency. Ayudas con:
- Preparación de clases para niveles A1, A2, B1, B2 (CEFR)
- Metodologías de enseñanza de español e inglés como segunda lengua
- Ideas de actividades, ejercicios y dinámicas para clases virtuales
- Cómo dar retroalimentación efectiva a estudiantes
- Tips para mantener estudiantes motivados
- Uso de la plataforma Passport2Fluency (disponibilidad, notas de sesión, tareas, learning path)
- Interpretación del progreso de estudiantes en el learning path

Sé práctico, conciso y orientado a la acción. Responde siempre en español.
No inventes funcionalidades de la plataforma que no existen.`
        : `You are a teaching assistant for Passport2Fluency tutors. You help with:
- Class preparation for CEFR levels A1, A2, B1, B2
- Teaching methodologies for Spanish and English as a second language
- Activity ideas, exercises, and dynamics for virtual classes
- How to give effective feedback to students
- Tips for keeping students motivated
- Platform usage (availability, session notes, assignments, learning path)
- Interpreting student progress on the learning path

Be practical, concise, and action-oriented. Always respond in English.
Do not make up platform features that don't exist.`;

      const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: chatMessages.slice(-20).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      res.json({ reply: text });
    } catch (error: any) {
      console.error("[tutor-ai-assistant] Error:", error);
      res.status(500).json({ message: "AI service error" });
    }
  });

  // Tutor reviews — see reviews left by students
  app.get("/api/tutor/reviews", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const reviews = await storage.getReviewsByTutor(tutor.id);
      const userIds = Array.from(new Set(reviews.map(r => r.userId)));
      const users = userIds.length > 0 ? await storage.getUsersByIds(userIds) : [];
      const userMap = new Map(users.map(u => [u.id, u]));

      const enriched = reviews.map(r => {
        const reviewer = userMap.get(r.userId);
        return {
          ...r,
          userName: reviewer ? `${reviewer.firstName} ${reviewer.lastName.charAt(0)}.` : "Student",
          userAvatar: reviewer?.profileImage || reviewer?.avatar || null,
        };
      });

      res.json({
        reviews: enriched,
        summary: {
          totalReviews: reviews.length,
          averageRating: tutor.rating ? parseFloat(tutor.rating.toString()) : 0,
          distribution: [5, 4, 3, 2, 1].map(star => ({
            stars: star,
            count: reviews.filter(r => r.rating === star).length,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor respond to a review
  app.put("/api/tutor/reviews/:id/respond", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const reviewId = parseInt(req.params.id);
      const { response } = req.body;
      if (!response?.trim()) return res.status(400).json({ message: "Response is required" });

      // Verify this review belongs to this tutor
      const reviews = await storage.getReviewsByTutor(tutor.id);
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return res.status(404).json({ message: "Review not found" });

      const updated = await storage.updateReview(reviewId, {
        tutorResponse: response.trim(),
        respondedAt: new Date(),
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor materials library
  app.get("/api/tutor/materials", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });
      const materials = await storage.getTutorMaterials(tutor.id);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tutor/materials", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const { title, description, fileUrl, externalUrl, fileType, level, category } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      if (!fileUrl && !externalUrl) return res.status(400).json({ message: "File or external URL is required" });

      const material = await storage.createTutorMaterial({
        tutorId: tutor.id,
        title: title.trim(),
        description: description || null,
        fileUrl: fileUrl || null,
        externalUrl: externalUrl || null,
        fileType: fileType || (externalUrl ? "link" : "document"),
        level: level || null,
        category: category || "general",
      });

      res.status(201).json(material);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tutor/materials/:id", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      // Verify ownership — only delete own materials
      const materials = await storage.getTutorMaterials(tutor.id);
      if (!materials.some(m => m.id === id)) {
        return res.status(403).json({ message: "Not authorized to delete this material" });
      }

      await storage.deleteTutorMaterial(id);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor payments — history for the logged-in tutor
  app.get("/api/tutor/payments", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const payments = await storage.getTutorPayments(tutor.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── ICS Calendar Feed ──

  // Generate or get existing ICS feed token
  app.post("/api/tutor/calendar-feed/generate", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      let token = tutor.icsToken;
      if (!token) {
        token = crypto.randomBytes(32).toString("hex");
        await storage.updateTutor(tutor.id, { icsToken: token });
      }

      const baseUrl = config.NODE_ENV === "production"
        ? (config.APP_URL || `https://${req.get("host")}`)
        : `http://${req.get("host")}`;
      const feedUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;

      res.json({ feedUrl, token });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current feed status
  app.get("/api/tutor/calendar-feed/status", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      if (!tutor.icsToken) return res.json({ active: false, feedUrl: null });

      const baseUrl = config.NODE_ENV === "production"
        ? (config.APP_URL || `https://${req.get("host")}`)
        : `http://${req.get("host")}`;
      const feedUrl = `${baseUrl}/api/calendar/feed/${tutor.icsToken}.ics`;

      res.json({ active: true, feedUrl });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Revoke ICS feed token
  app.delete("/api/tutor/calendar-feed", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      await storage.updateTutor(tutor.id, { icsToken: null });
      res.json({ message: "Feed revoked" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public ICS feed endpoint (no auth — token IS the auth)
  app.get("/api/calendar/feed/:token.ics", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length < 32) return res.status(404).send("Not found");

      // Find tutor by ICS token
      const tutor = await storage.getTutorByIcsToken(token);
      if (!tutor) return res.status(404).send("Not found");

      // Get all scheduled + completed classes for this tutor
      const allClasses = await storage.getClassesByTutor(tutor.id);
      const relevantClasses = allClasses.filter(c => c.status === "scheduled" || c.status === "completed");

      // Build ICS content
      const now = new Date();
      const stamp = formatIcsDate(now);
      let ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Passport2Fluency//Classes//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:P2F Classes - ${tutor.name}`,
        "X-WR-TIMEZONE:UTC",
      ];

      for (const cls of relevantClasses) {
        const start = new Date(cls.scheduledAt);
        const end = new Date(start.getTime() + (cls.duration || 60) * 60000);
        const student = await storage.getUser(cls.userId);
        const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";

        ics.push(
          "BEGIN:VEVENT",
          `UID:class-${cls.id}@passport2fluency.com`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${formatIcsDate(start)}`,
          `DTEND:${formatIcsDate(end)}`,
          `SUMMARY:${escapeIcs(cls.title || `Class with ${studentName}`)}`,
          `DESCRIPTION:${escapeIcs(`Student: ${studentName}\\nDuration: ${cls.duration || 60} min${cls.meetingLink ? `\\nMeeting: ${cls.meetingLink}` : ""}`)}`,
          cls.meetingLink ? `URL:${cls.meetingLink}` : "",
          `STATUS:${cls.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
          "END:VEVENT",
        );
      }

      ics.push("END:VCALENDAR");

      const icsContent = ics.filter(Boolean).join("\r\n");
      res.set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="p2f-classes.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.send(icsContent);
    } catch (error) {
      console.error("ICS feed error:", error);
      res.status(500).send("Internal server error");
    }
  });
}

function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
