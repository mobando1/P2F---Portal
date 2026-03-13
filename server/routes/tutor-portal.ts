import type { Express } from "express";
import { storage } from "../storage";
import { notificationService } from "../services/notification";
import { gamificationService } from "../services/gamification";
import { requireTutor } from "./auth";

export function registerTutorPortalRoutes(app: Express) {
  // Helper to get tutor profile from logged-in user
  async function getTutorFromUser(userId: number) {
    const allTutors = await storage.getAllTutors();
    return allTutors.find(t => t.userId === userId);
  }

  // Dashboard stats
  app.get("/api/tutor/dashboard", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);

      if (!tutor) {
        return res.status(404).json({ message: "Tutor profile not found" });
      }

      const tutorClasses = await storage.getClassesByTutor(tutor.id);
      const now = new Date();

      const scheduled = tutorClasses.filter(c => c.status === "scheduled" && new Date(c.scheduledAt) > now);
      const completed = tutorClasses.filter(c => c.status === "completed");
      const today = tutorClasses.filter(c => {
        const d = new Date(c.scheduledAt);
        return c.status === "scheduled" && d.toDateString() === now.toDateString();
      });

      // Get student info for upcoming classes
      const upcomingWithStudents = await Promise.all(
        scheduled.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 10)
          .map(async (c) => {
            const student = await storage.getUser(c.userId);
            return {
              ...c,
              studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
              studentEmail: student?.email || "",
            };
          })
      );

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
        },
        upcomingClasses: upcomingWithStudents,
      });
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

      // Enrich with student names
      const enriched = await Promise.all(
        tutorClasses.map(async (c) => {
          const student = await storage.getUser(c.userId);
          return {
            ...c,
            studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          };
        })
      );

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

  // Mark class as completed
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

      // Atomic: only completes if still scheduled
      const updated = await storage.completeClassIfScheduled(classId);
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

  // Get tutor's students
  app.get("/api/tutor/students", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await getTutorFromUser(userId);
      if (!tutor) return res.status(404).json({ message: "Tutor profile not found" });

      const tutorClasses = await storage.getClassesByTutor(tutor.id);

      // Get unique student IDs
      const studentIds = Array.from(new Set(tutorClasses.map(c => c.userId)));

      const students = await Promise.all(
        studentIds.map(async (studentId) => {
          const student = await storage.getUser(studentId);
          const studentClasses = tutorClasses.filter(c => c.userId === studentId);
          const completed = studentClasses.filter(c => c.status === "completed");
          const lastClass = studentClasses
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

          return {
            id: studentId,
            name: student ? `${student.firstName} ${student.lastName}` : "Unknown",
            email: student?.email || "",
            profileImage: student?.profileImage || null,
            totalClasses: studentClasses.length,
            completedClasses: completed.length,
            lastClassDate: lastClass?.scheduledAt || null,
          };
        })
      );

      res.json(students.sort((a, b) => b.totalClasses - a.totalClasses));
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

      const { bio, phone, languages, certifications } = req.body;
      const updated = await storage.updateTutor(tutor.id, {
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(languages !== undefined && { languages }),
        ...(certifications !== undefined && { certifications }),
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
