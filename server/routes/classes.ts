import type { Express } from "express";
import { storage } from "../storage";
import { insertClassSchema } from "@shared/schema";
import { CalendarIntegrationService } from "../services/calendar-integration";
import { availabilityService } from "../services/availability";
import { notificationService } from "../services/notification";
import { dripCampaignService } from "../services/drip-campaign";
import { googleMeetService } from "../services/google-meet";
import { requireAuth, requireAdmin } from "./auth";
import { logger } from "../services/logger";

const calendarService = new CalendarIntegrationService();

export function registerClassRoutes(app: Express) {
  // Get classes for a user
  app.get("/api/classes/:userId", requireAuth, async (req, res) => {
    try {
      const requestingUserId = req.session.userId!;
      const userId = parseInt(req.params.userId);

      // Authorization: users can only see their own classes (admins can see any)
      const requestingUser = await storage.getUser(requestingUserId);
      if (requestingUserId !== userId && requestingUser?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: you can only view your own classes" });
      }

      const classes = await storage.getUserClasses(userId);

      const uniqueTutorIds = Array.from(new Set(classes.map(c => c.tutorId)));
      const tutors = await storage.getTutorsByIds(uniqueTutorIds);
      const tutorMap = new Map(tutors.map(t => [t.id, t.name]));

      const classesWithTutors = classes.map(classItem => ({
        ...classItem,
        tutorName: tutorMap.get(classItem.tutorId) || "Unknown Tutor",
      }));

      res.json(classesWithTutors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new class
  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const classData = insertClassSchema.parse({ ...req.body, userId });

      // Atomic credit deduction — prevents race conditions
      const deducted = await storage.deductClassCredit(userId);
      if (!deducted) {
        return res.status(400).json({ message: "No remaining class credits available" });
      }

      // Validate availability and check conflicts
      const validation = await availabilityService.validateBooking(
        classData.tutorId,
        new Date(classData.scheduledAt),
        classData.duration || 60
      );
      if (!validation.valid) {
        // Refund the credit since we can't book
        await storage.refundClassCredit(userId);
        return res.status(409).json({ message: validation.reason });
      }

      // Generate meeting link + create class — refund credit on any failure
      let calendarEventId: string | null = null;
      let newClass;
      try {
        if (!classData.meetingLink) {
          const tutor = await storage.getTutor(classData.tutorId);
          const result = await googleMeetService.createMeetingLink({
            title: classData.title || `Class with ${tutor?.name || 'Tutor'}`,
            scheduledAt: new Date(classData.scheduledAt),
            duration: classData.duration || 60,
            tutorName: tutor?.name || 'Tutor',
            tutorId: classData.tutorId,
          });
          (classData as any).meetingLink = result.meetingLink;
          calendarEventId = result.calendarEventId || null;
          (classData as any).calendarEventId = calendarEventId;
          (classData as any).tutorCalendarEventId = result.tutorCalendarEventId || null;
        }

        newClass = await storage.createClass(classData);
      } catch (err) {
        await storage.refundClassCredit(userId);
        // Clean up orphaned calendar event if class creation failed
        if (calendarEventId) {
          googleMeetService.deleteCalendarEvent(calendarEventId).catch(() => {});
        }
        throw err;
      }

      // Notify
      notificationService.onClassBooked({
        studentId: userId,
        tutorId: classData.tutorId,
        classId: newClass.id,
        scheduledAt: new Date(classData.scheduledAt),
        meetingLink: newClass.meetingLink || undefined,
      });

      res.status(201).json(newClass);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Book a free trial class
  app.post("/api/classes/book-trial", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { tutorId, scheduledAt, category } = req.body;

      if (!tutorId || !scheduledAt) {
        return res.status(400).json({ message: "Tutor ID and scheduled time are required" });
      }

      // Check if user already used their trial
      const hasUsed = await storage.hasUsedTrial(userId);
      if (hasUsed) {
        return res.status(400).json({ message: "Free trial already used" });
      }

      // Verify tutor exists
      const tutor = await storage.getTutor(tutorId);
      if (!tutor) {
        return res.status(404).json({ message: "Tutor not found" });
      }

      // Validate availability and check conflicts
      const validation = await availabilityService.validateBooking(
        tutorId,
        new Date(scheduledAt),
        50
      );
      if (!validation.valid) {
        return res.status(409).json({ message: validation.reason });
      }

      // Generate meeting link (optional — don't block booking if Meet API fails)
      let meetingLink: string | null = null;
      let calendarEventId: string | null = null;
      let tutorCalendarEventId: string | null = null;
      try {
        const meetResult = await googleMeetService.createMeetingLink({
          title: `Free Trial Class - ${tutor.name}`,
          scheduledAt: new Date(scheduledAt),
          duration: 50,
          tutorName: tutor.name,
          tutorId,
        });
        meetingLink = meetResult.meetingLink || null;
        calendarEventId = meetResult.calendarEventId || null;
        tutorCalendarEventId = meetResult.tutorCalendarEventId || null;
      } catch (meetErr) {
        console.warn("[book-trial] Google Meet link creation failed, booking without link:", meetErr);
      }

      // Create the trial class
      const trialClass = await storage.createClass({
        userId,
        tutorId,
        title: "Free Trial Class",
        description: `Free 50-minute trial class with ${tutor.name}`,
        scheduledAt: new Date(scheduledAt),
        duration: 50,
        status: "scheduled",
        isTrial: true,
        classCategory: category || `${Array.isArray(tutor.classType) ? tutor.classType[0] : tutor.classType}-${Array.isArray(tutor.languageTaught) ? tutor.languageTaught[0] : tutor.languageTaught}`,
        meetingLink,
        calendarEventId: calendarEventId || null,
        tutorCalendarEventId: tutorCalendarEventId || null,
      });

      // Mark trial as used
      await storage.updateUser(userId, {
        trialCompleted: true,
        trialTutorId: tutorId,
      });

      // Notify
      notificationService.onClassBooked({
        studentId: userId,
        tutorId,
        classId: trialClass.id,
        scheduledAt: new Date(scheduledAt),
        meetingLink: meetingLink || undefined,
      }).catch(err => console.error("[book-trial] Notification error:", err));

      // Drip campaign: send pre-class tips
      dripCampaignService.onTrialBooked(userId, new Date(scheduledAt))
        .catch(err => console.error("[book-trial] Drip campaign error:", err));

      // Speed-to-lead: queue a post-trial follow-up task for sales (due the day after the trial)
      (async () => {
        try {
          const admin = await storage.getFirstAdmin();
          const student = await storage.getUser(userId);
          if (admin && student) {
            const due = new Date(scheduledAt);
            due.setDate(due.getDate() + 1);
            await storage.createCrmTask({
              userId,
              assignedTo: admin.id,
              title: `Seguimiento post-trial: ${student.firstName} ${student.lastName}`,
              description: `Trial con ${tutor.name}. Dar seguimiento para cerrar la venta.`,
              dueDate: due,
              priority: "high",
            });
          }
        } catch (e) {
          console.error("[book-trial] Failed to create post-trial task:", e);
        }
      })();

      res.status(201).json(trialClass);
    } catch (error) {
      console.error("[book-trial] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel a class.
  // Atomic: locks the row, validates state (only 'scheduled' classes that
  // haven't already been refunded by the cron), refunds, and updates status —
  // all inside one transaction so the cron's Sweep 2 can't double-refund.
  app.put("/api/classes/:id/cancel", requireAuth, async (req, res) => {
    const classId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { pool } = await import("../db");
    if (!pool) return res.status(500).json({ message: "Database unavailable" });

    const client = await pool.connect();
    let outcome: "ok" | "not_found" | "forbidden" | "too_late" | "wrong_state" = "wrong_state";
    let snapshot: { tutorId: number; scheduledAt: Date; calendarEventId: string | null; tutorCalendarEventId: string | null } | null = null;

    try {
      await client.query("BEGIN");
      const lockRes = await client.query<{
        id: number;
        user_id: number;
        tutor_id: number;
        status: string;
        scheduled_at: Date;
        confirmation_status: string | null;
        calendar_event_id: string | null;
        tutor_calendar_event_id: string | null;
      }>(
        `SELECT id, user_id, tutor_id, status, scheduled_at, confirmation_status,
                calendar_event_id, tutor_calendar_event_id
           FROM classes WHERE id = $1 FOR UPDATE`,
        [classId]
      );
      const cls = lockRes.rows[0];
      if (!cls) {
        outcome = "not_found";
      } else if (cls.user_id !== userId) {
        outcome = "forbidden";
      } else if (cls.status !== "scheduled") {
        outcome = "wrong_state";
      } else {
        const hoursDiff = (new Date(cls.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursDiff < 12) {
          outcome = "too_late";
        } else {
          const refund = await client.query<{ class_credits: number | null }>(
            `UPDATE users SET class_credits = COALESCE(class_credits, 0) + 1
              WHERE id = $1 RETURNING class_credits`,
            [userId]
          );
          if (!refund.rows[0]) {
            throw new Error(`User ${userId} not found while refunding cancel of class ${classId}`);
          }
          await client.query(
            `UPDATE classes
                SET status='cancelled',
                    confirmation_status = COALESCE(confirmation_status, 'cancelled_by_student')
              WHERE id=$1`,
            [classId]
          );
          outcome = "ok";
          snapshot = {
            tutorId: cls.tutor_id,
            scheduledAt: new Date(cls.scheduled_at),
            calendarEventId: cls.calendar_event_id,
            tutorCalendarEventId: cls.tutor_calendar_event_id,
          };
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      logger.error({ err, classId, userId }, "cancel-class transaction failed");
      client.release();
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }

    if (outcome === "not_found") return res.status(404).json({ message: "Class not found or not authorized" });
    if (outcome === "forbidden") return res.status(404).json({ message: "Class not found or not authorized" });
    if (outcome === "wrong_state") return res.status(400).json({ message: "Class is not in a cancellable state" });
    if (outcome === "too_late") return res.status(400).json({ message: "Cannot cancel within 12 hours of class" });

    if (snapshot && (snapshot.calendarEventId || snapshot.tutorCalendarEventId)) {
      googleMeetService.deleteCalendarEvent(
        snapshot.calendarEventId || "",
        snapshot.tutorCalendarEventId || undefined,
        snapshot.tutorId
      ).catch(() => {});
    }
    if (snapshot) {
      notificationService.onClassCancelled({
        studentId: userId,
        tutorId: snapshot.tutorId,
        scheduledAt: snapshot.scheduledAt,
      }).catch(err => logger.error({ err, classId }, "cancel notify failed"));
    }
    res.json({ message: "Class cancelled successfully" });
  });

  // Reschedule a class
  app.put("/api/classes/:id/reschedule", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const { newScheduledAt } = req.body;

      if (!newScheduledAt) {
        return res.status(400).json({ message: "newScheduledAt is required" });
      }

      // Get the class
      const classItem = await storage.getClassById(classId);

      if (!classItem || classItem.userId !== userId) {
        return res.status(404).json({ message: "Class not found or not authorized" });
      }

      if (classItem.status !== "scheduled") {
        return res.status(400).json({ message: "Only scheduled classes can be rescheduled" });
      }

      // Check 12h rule
      const now = new Date();
      const classDate = new Date(classItem.scheduledAt);
      const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 12) {
        return res.status(400).json({ message: "Cannot reschedule within 12 hours of class" });
      }

      // Validate new slot
      const newDate = new Date(newScheduledAt);
      const validation = await availabilityService.validateBooking(
        classItem.tutorId,
        newDate,
        classItem.duration || 60
      );
      if (!validation.valid) {
        return res.status(409).json({ message: validation.reason });
      }

      // Update the class
      const updated = await storage.updateClass(classId, { scheduledAt: newDate });

      // Update Google Calendar events if they exist
      if (classItem.calendarEventId || classItem.tutorCalendarEventId) {
        googleMeetService.updateCalendarEvent(
          classItem.calendarEventId || "",
          newDate,
          classItem.duration || 60,
          classItem.tutorCalendarEventId || undefined,
          classItem.tutorId
        ).catch(() => {});
      }

      // Notify
      notificationService.onClassRescheduled({
        studentId: userId,
        tutorId: classItem.tutorId,
        classId,
        scheduledAt: newDate,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error rescheduling class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Book recurring classes (same time each week)
  app.post("/api/classes/book-recurring", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { tutorId, startDate, startTime, weeksCount } = req.body;

      if (!tutorId || !startDate || !startTime || !weeksCount) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (weeksCount < 1 || weeksCount > 12) {
        return res.status(400).json({ message: "Weeks must be between 1 and 12" });
      }

      // Check user credits
      const user = await storage.getUser(userId);
      if (!user || (user.classCredits || 0) < weeksCount) {
        return res.status(400).json({
          message: `Not enough credits. Need ${weeksCount}, have ${user?.classCredits || 0}`,
        });
      }

      // Verify tutor exists
      const tutor = await storage.getTutor(tutorId);
      if (!tutor) {
        return res.status(404).json({ message: "Tutor not found" });
      }

      const bookedClasses = [];
      const failedWeeks = [];

      for (let week = 0; week < weeksCount; week++) {
        const classDate = new Date(startDate);
        classDate.setDate(classDate.getDate() + week * 7);
        const scheduledAt = new Date(`${classDate.toISOString().split("T")[0]}T${startTime}`);

        // Validate each week
        const validation = await availabilityService.validateBooking(tutorId, scheduledAt, 60);
        if (!validation.valid) {
          failedWeeks.push({ week: week + 1, reason: validation.reason });
          continue;
        }

        const { meetingLink, calendarEventId, tutorCalendarEventId } = await googleMeetService.createMeetingLink({
          title: `Recurring Class with ${tutor.name} (${week + 1}/${weeksCount})`,
          scheduledAt,
          duration: 60,
          tutorName: tutor.name,
          tutorId,
        });

        const newClass = await storage.createClass({
          userId,
          tutorId,
          title: `Recurring Class with ${tutor.name}`,
          description: `Weekly class (${week + 1}/${weeksCount})`,
          scheduledAt,
          duration: 60,
          status: "scheduled",
          meetingLink,
          calendarEventId: calendarEventId || null,
          tutorCalendarEventId: tutorCalendarEventId || null,
        });

        bookedClasses.push(newClass);
      }

      // Deduct credits for successfully booked classes (atomic per class)
      if (bookedClasses.length > 0) {
        for (let i = 0; i < bookedClasses.length; i++) {
          await storage.deductClassCredit(userId);
        }

        // Notify for first class
        notificationService.onClassBooked({
          studentId: userId,
          tutorId,
          classId: bookedClasses[0].id,
          scheduledAt: new Date(bookedClasses[0].scheduledAt),
        });
      }

      res.status(201).json({
        booked: bookedClasses.length,
        failed: failedWeeks.length,
        failedWeeks,
        classes: bookedClasses,
      });
    } catch (error) {
      console.error("Error booking recurring classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user achievements
  app.get("/api/achievements/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const achievements = await storage.getAchievements(userId);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ----- Calendar Integration Routes -----

  // Get tutor availability for a specific date
  app.get("/api/calendar/tutor/:tutorId/availability", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.tutorId);
      const { date } = req.query;

      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const availability = await calendarService.getTutorAvailability(tutorId, date);
      res.json(availability);
    } catch (error) {
      console.error("Error getting tutor availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor weekly availability grid (public — for student booking)
  app.get("/api/calendar/tutor/:tutorId/week", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.tutorId);
      const startDateStr = req.query.startDate as string;

      // Calculate Monday of the week
      const weekStart = startDateStr ? new Date(startDateStr + "T12:00:00") : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(now);
        mon.setDate(now.getDate() + diff);
        return mon;
      })();

      const days = [];
      const now = new Date();
      // Allow booking same day, but require at least 1h lead time for the slot start
      const cutoff = new Date(now);
      cutoff.setMinutes(cutoff.getMinutes() + 60);
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let slots: Array<{ start: string; end: string; available: boolean }> = [];
        if (!isPast) {
          try {
            slots = await calendarService.getTutorAvailability(tutorId, dateStr);
          } catch (err: any) {
            console.warn(`[calendar/week] Failed to get availability for tutor ${tutorId} on ${dateStr}:`, err.message);
            slots = [];
          }
        }

        let availableSlots = slots.filter(s => s.available);

        // For today, drop slots whose start time is already past (or within the 1h lead window)
        if (dateStr === todayStr) {
          availableSlots = availableSlots.filter(s => {
            const slotStart = new Date(`${dateStr}T${s.start}`);
            return slotStart >= cutoff;
          });
        }

        days.push({
          date: dateStr,
          dayOfWeek: date.getDay(),
          isPast,
          slots: availableSlots,
        });
      }

      res.json({ weekStart: weekStart.toISOString().split("T")[0], days });
    } catch (error) {
      console.error("Error getting tutor weekly availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all tutors availability for a date
  app.get("/api/calendar/availability", async (req, res) => {
    try {
      const { date } = req.query;

      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const availability = await calendarService.getAllTutorsAvailability(date);
      res.json(availability);
    } catch (error) {
      console.error("Error getting all tutors availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Book a class with specific tutor (via calendar)
  app.post("/api/calendar/book", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { tutorId, date, startTime, endTime } = req.body;

      if (!tutorId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const result = await calendarService.bookClassWithTutor(
        userId,
        tutorId,
        date,
        startTime,
        endTime
      );

      if (result.success) {
        res.json({
          message: result.message,
          classId: result.classId,
          meetingLink: result.meetingLink,
        });
      } else {
        const status = result.message?.includes('already booked') ? 409 : 400;
        res.status(status).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error booking class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel a class (via calendar service)
  app.put("/api/calendar/cancel/:classId", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const userId = req.session.userId!;

      const result = await calendarService.cancelClass(classId, userId);

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error cancelling class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get all classes
  app.get("/api/admin/classes", requireAdmin, async (_req, res) => {
    try {
      const allClasses = await storage.getAllClasses();
      res.json(allClasses);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Calendar data with tutor info
  app.get("/api/admin/calendar", requireAdmin, async (req, res) => {
    try {
      const { start, end, tutorId } = req.query;
      const allClasses = await storage.getAllClasses();
      const allTutors = await storage.getAllTutors();
      const tutorMap = new Map(allTutors.map(t => [t.id, t]));

      // Color palette for tutors
      const colors = ["#1C7BB1", "#F59E1C", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#6366F1"];

      let filtered = allClasses;

      if (start && typeof start === "string") {
        filtered = filtered.filter(c => new Date(c.scheduledAt) >= new Date(start));
      }
      if (end && typeof end === "string") {
        filtered = filtered.filter(c => new Date(c.scheduledAt) <= new Date(end));
      }
      if (tutorId && tutorId !== "all" && typeof tutorId === "string") {
        filtered = filtered.filter(c => c.tutorId === parseInt(tutorId));
      }

      const userIds = Array.from(new Set(filtered.map(c => c.userId)));
      const students = await storage.getUsersByIds(userIds);
      const userMap = new Map(students.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email]));

      const calendarEvents = filtered.map(c => {
        const tutor = tutorMap.get(c.tutorId);
        return {
          id: c.id,
          title: c.title,
          scheduledAt: c.scheduledAt,
          duration: c.duration,
          status: c.status,
          tutorId: c.tutorId,
          tutorName: tutor?.name || "Unknown",
          tutorColor: colors[c.tutorId % colors.length],
          studentName: userMap.get(c.userId) || "Unknown",
          meetingLink: c.meetingLink,
          isTrial: c.isTrial,
        };
      });

      res.json({
        events: calendarEvents,
        tutors: allTutors.map(t => ({
          id: t.id,
          name: t.name,
          color: colors[t.id % colors.length],
        })),
      });
    } catch (error) {
      console.error("Error getting calendar data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // List classes that need attendance confirmation from the calling user.
  // Tutor sees their pending_tutor classes; student sees their pending_student classes.
  app.get("/api/classes/pending-confirmation", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { pool } = await import("../db");
      if (!pool) return res.json([]);

      const tutor = await storage.getTutorByUserId(userId);
      const params: any[] = [];
      let query: string;
      if (tutor) {
        params.push(tutor.id);
        query = `
          SELECT c.id, c.title, c.scheduled_at, c.duration, c.tutor_confirmation_deadline AS deadline,
                 'tutor' AS role,
                 (u.first_name || ' ' || u.last_name) AS counterpart_name
          FROM classes c JOIN users u ON u.id = c.user_id
          WHERE c.tutor_id = $1
            AND c.confirmation_status = 'pending_tutor'
            AND c.scheduled_at > NOW() - INTERVAL '30 days'
          ORDER BY c.scheduled_at ASC LIMIT 20
        `;
      } else {
        params.push(userId);
        query = `
          SELECT c.id, c.title, c.scheduled_at, c.duration, c.student_confirmation_deadline AS deadline,
                 'student' AS role,
                 t.name AS counterpart_name
          FROM classes c JOIN tutors t ON t.id = c.tutor_id
          WHERE c.user_id = $1
            AND c.confirmation_status = 'pending_student'
            AND c.scheduled_at > NOW() - INTERVAL '30 days'
          ORDER BY c.scheduled_at ASC LIMIT 20
        `;
      }
      const result = await pool.query(query, params);
      res.json(result.rows.map(r => ({
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduled_at,
        duration: r.duration,
        deadline: r.deadline,
        role: r.role,
        counterpartName: r.counterpart_name,
      })));
    } catch (error) {
      console.error("Error fetching pending confirmations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Confirm whether a class actually happened.
  // All state mutations happen inside a single transaction with SELECT FOR
  // UPDATE so concurrent confirmations (tutor + student firing at the same
  // moment, or the cron racing the user) can't double-debit / double-refund
  // / overwrite each other's state.
  app.post("/api/classes/:id/confirm-attendance", requireAuth, async (req, res) => {
    const classId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const { attended } = req.body || {};
    if (typeof attended !== "boolean") {
      return res.status(400).json({ message: "Body must include { attended: boolean }" });
    }

    const tutor = await storage.getTutorByUserId(userId);
    const { pool } = await import("../db");
    if (!pool) return res.status(500).json({ message: "Database unavailable" });

    const client = await pool.connect();
    let outcome: "ok" | "not_found" | "forbidden" | "wrong_state" = "wrong_state";
    let postCommitNotify: (() => void) | null = null;
    let classSnapshot: { tutorId: number; userId: number; scheduledAt: Date; duration: number } | null = null;

    try {
      await client.query("BEGIN");
      const lockRes = await client.query<{
        id: number;
        user_id: number;
        tutor_id: number;
        scheduled_at: Date;
        duration: number;
        confirmation_status: string | null;
      }>(
        `SELECT id, user_id, tutor_id, scheduled_at, duration, confirmation_status
           FROM classes WHERE id = $1 FOR UPDATE`,
        [classId]
      );
      const cls = lockRes.rows[0];
      if (!cls) {
        outcome = "not_found";
      } else {
        const isTutor = !!tutor && cls.tutor_id === tutor.id;
        const isStudent = cls.user_id === userId;
        classSnapshot = {
          tutorId: cls.tutor_id,
          userId: cls.user_id,
          scheduledAt: new Date(cls.scheduled_at),
          duration: cls.duration,
        };
        if (!isTutor && !isStudent) {
          outcome = "forbidden";
        } else if (isTutor) {
          if (cls.confirmation_status !== "pending_tutor") {
            outcome = "wrong_state";
          } else if (attended) {
            await client.query(
              `UPDATE classes
                  SET tutor_confirmation='attended',
                      confirmation_status='pending_student',
                      student_confirmation_deadline = NOW() + interval '48 hours'
                WHERE id=$1`,
              [classId]
            );
            outcome = "ok";
            postCommitNotify = () => {
              notificationService.onAttendanceConfirmationNeeded({
                to: "student",
                classId,
                tutorId: cls.tutor_id,
                studentId: cls.user_id,
                scheduledAt: new Date(cls.scheduled_at),
              }).catch(err => logger.error({ err, classId }, "notify student failed"));
            };
          } else {
            // Tutor reports no-show: refund inside the same txn so no double-refund
            // can happen with the cron's Sweep 2.
            const refund = await client.query<{ class_credits: number | null }>(
              `UPDATE users SET class_credits = COALESCE(class_credits, 0) + 1
                WHERE id = $1 RETURNING class_credits`,
              [cls.user_id]
            );
            if (!refund.rows[0]) {
              throw new Error(`User ${cls.user_id} not found while refunding class ${classId}`);
            }
            await client.query(
              `UPDATE classes
                  SET tutor_confirmation='no_show',
                      status='cancelled',
                      confirmation_status='no_show_refunded'
                WHERE id=$1`,
              [classId]
            );
            outcome = "ok";
            postCommitNotify = () => {
              notificationService.onClassCancelled({
                studentId: cls.user_id,
                tutorId: cls.tutor_id,
                scheduledAt: new Date(cls.scheduled_at),
              }).catch(err => logger.error({ err, classId }, "notify cancel failed"));
            };
          }
        } else {
          // Student confirmation
          if (cls.confirmation_status !== "pending_student") {
            outcome = "wrong_state";
          } else if (attended) {
            await client.query(
              `UPDATE classes
                  SET student_confirmation='attended',
                      status='completed',
                      confirmation_status='confirmed'
                WHERE id=$1`,
              [classId]
            );
            outcome = "ok";
            postCommitNotify = () => {
              notificationService.onClassCompleted({
                studentId: cls.user_id,
                tutorId: cls.tutor_id,
                scheduledAt: new Date(cls.scheduled_at),
              }).catch(err => logger.error({ err, classId }, "notify completed failed"));
            };
          } else {
            await client.query(
              `UPDATE classes
                  SET student_confirmation='no_show',
                      confirmation_status='disputed'
                WHERE id=$1`,
              [classId]
            );
            outcome = "ok";
            postCommitNotify = () => {
              notificationService.onClassDisputed({
                classId,
                studentId: cls.user_id,
                tutorId: cls.tutor_id,
                scheduledAt: new Date(cls.scheduled_at),
              }).catch(err => logger.error({ err, classId }, "notify disputed failed"));
            };
          }
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      logger.error({ err, classId, userId }, "confirm-attendance transaction failed");
      client.release();
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }

    if (outcome === "not_found") return res.status(404).json({ message: "Class not found" });
    if (outcome === "forbidden") return res.status(403).json({ message: "Not a participant of this class" });
    if (outcome === "wrong_state") return res.status(400).json({ message: "Class not in a confirmable state for you" });

    // After the txn commits, fire notifications and update progress (best-effort).
    if (postCommitNotify) postCommitNotify();
    if (classSnapshot && outcome === "ok") {
      // Student confirming attended: bump progress counters.
      try {
        if (typeof attended === "boolean" && attended) {
          const isStudentPath = classSnapshot.userId === userId;
          if (isStudentPath) {
            const progress = await storage.getUserProgress(classSnapshot.userId);
            await storage.updateUserProgress(classSnapshot.userId, {
              classesCompleted: (progress?.classesCompleted || 0) + 1,
              learningHours: String(parseFloat(progress?.learningHours || "0") + (classSnapshot.duration || 60) / 60),
            });
          }
        }
      } catch (err) {
        logger.error({ err, classId }, "post-commit progress update failed (non-fatal)");
      }
    }
    res.json({ ok: true });
  });

  // Admin: list disputed classes
  app.get("/api/admin/classes/disputed", requireAdmin, async (_req, res) => {
    try {
      const { pool } = await import("../db");
      if (!pool) return res.json([]);
      const result = await pool.query(`
        SELECT c.id, c.title, c.scheduled_at, c.duration,
               c.tutor_confirmation, c.student_confirmation,
               c.user_id, c.tutor_id,
               (u.first_name || ' ' || u.last_name) AS student_name,
               u.email AS student_email,
               t.name AS tutor_name
        FROM classes c
        JOIN users u ON u.id = c.user_id
        JOIN tutors t ON t.id = c.tutor_id
        WHERE c.confirmation_status = 'disputed'
        ORDER BY c.scheduled_at DESC
      `);
      res.json(result.rows.map(r => ({
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduled_at,
        duration: r.duration,
        tutorConfirmation: r.tutor_confirmation,
        studentConfirmation: r.student_confirmation,
        userId: r.user_id,
        tutorId: r.tutor_id,
        studentName: r.student_name,
        studentEmail: r.student_email,
        tutorName: r.tutor_name,
      })));
    } catch (error) {
      console.error("Error fetching disputed classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: resolve a disputed class
  app.post("/api/admin/classes/:id/resolve-dispute", requireAdmin, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { resolution } = req.body || {};
      if (resolution !== "attended" && resolution !== "refund") {
        return res.status(400).json({ message: "resolution must be 'attended' or 'refund'" });
      }
      const classItem = await storage.getClassById(classId);
      if (!classItem) return res.status(404).json({ message: "Class not found" });
      if ((classItem as any).confirmationStatus !== "disputed") {
        return res.status(400).json({ message: "Class is not in disputed state" });
      }

      const { pool } = await import("../db");
      if (!pool) return res.status(500).json({ message: "Database unavailable" });

      if (resolution === "attended") {
        await pool.query(
          `UPDATE classes SET status='completed', confirmation_status='confirmed' WHERE id=$1`,
          [classId]
        );
      } else {
        await storage.refundClassCredit(classItem.userId);
        await pool.query(
          `UPDATE classes SET status='cancelled', confirmation_status='no_show_refunded' WHERE id=$1`,
          [classId]
        );
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Observability self-test endpoints. Admin-only. Used to verify Sentry +
  // logger pipeline end-to-end after configuring SENTRY_DSN in Railway.
  // Delete after Phase 0 is fully validated if you want.
  // ─── Recording consent ────────────────────────────────────────────
  app.get("/api/recording-consent/status", requireAuth, async (req, res) => {
    try {
      const { hasUserConsented, CURRENT_POLICY_VERSION } = await import("../services/recording-consent");
      const userId = req.session.userId!;
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      const consented = await hasUserConsented(userId, classId);
      res.json({ consented, policyVersion: CURRENT_POLICY_VERSION });
    } catch (err) {
      console.error("recording-consent status error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/recording-consent", requireAuth, async (req, res) => {
    try {
      const { recordConsent, CURRENT_POLICY_VERSION } = await import("../services/recording-consent");
      const userId = req.session.userId!;
      const { classId, scope } = req.body || {};
      const finalScope = scope === "global" ? "global" : "class";
      if (finalScope === "class" && !classId) {
        return res.status(400).json({ message: "classId required for class-scope consent" });
      }
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
      const userAgent = req.headers["user-agent"] || undefined;
      await recordConsent({
        userId,
        classId: finalScope === "class" ? classId : undefined,
        scope: finalScope,
        ipAddress: ip,
        userAgent,
      });
      res.json({ ok: true, policyVersion: CURRENT_POLICY_VERSION });
    } catch (err) {
      console.error("recording-consent record error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ─── Feature flags ────────────────────────────────────────────────
  // Public: evaluated flags for the current user (or anonymous baseline).
  app.get("/api/feature-flags", async (req, res) => {
    try {
      const { evaluateAllFlags } = await import("../services/feature-flags");
      const userId = req.session?.userId;
      const flags = await evaluateAllFlags(userId);
      res.json(flags);
    } catch (err) {
      console.error("feature-flags evaluate error", err);
      res.json({});
    }
  });

  app.get("/api/admin/feature-flags", requireAdmin, async (_req, res) => {
    try {
      const { listFlags } = await import("../services/feature-flags");
      res.json(await listFlags());
    } catch (err) {
      console.error("feature-flags list error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/feature-flags/:key", requireAdmin, async (req, res) => {
    try {
      const { upsertFlag } = await import("../services/feature-flags");
      const { enabled, rolloutPercentage, userOverrides, description } = req.body || {};
      if (rolloutPercentage !== undefined && (rolloutPercentage < 0 || rolloutPercentage > 100)) {
        return res.status(400).json({ message: "rolloutPercentage must be 0-100" });
      }
      await upsertFlag({
        key: req.params.key,
        enabled,
        rolloutPercentage,
        userOverrides: Array.isArray(userOverrides) ? userOverrides : undefined,
        description,
        updatedBy: req.session.userId,
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("feature-flags upsert error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/feature-flags/:key", requireAdmin, async (req, res) => {
    try {
      const { deleteFlag } = await import("../services/feature-flags");
      await deleteFlag(req.params.key);
      res.json({ ok: true });
    } catch (err) {
      console.error("feature-flags delete error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI cost dashboard — totals and breakdown for admin observability
  app.get("/api/admin/ai-cost", requireAdmin, async (_req, res) => {
    try {
      const { pool } = await import("../db");
      if (!pool) return res.json({ available: false });

      const [totals, byFeature, byModel, topUsers] = await Promise.all([
        pool.query<{ scope: string; total: string; calls: string }>(`
          SELECT 'today' AS scope, COALESCE(SUM(cost_usd),0)::text AS total, COUNT(*)::text AS calls
            FROM ai_usage WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='success'
          UNION ALL
          SELECT 'last_7_days', COALESCE(SUM(cost_usd),0)::text, COUNT(*)::text
            FROM ai_usage WHERE created_at >= NOW() - INTERVAL '7 days' AND status='success'
          UNION ALL
          SELECT 'this_month', COALESCE(SUM(cost_usd),0)::text, COUNT(*)::text
            FROM ai_usage WHERE created_at >= date_trunc('month', NOW()) AND status='success'
          UNION ALL
          SELECT 'blocked_today', COALESCE(SUM(cost_usd),0)::text, COUNT(*)::text
            FROM ai_usage WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='budget_blocked'
        `),
        pool.query<{ feature: string; total: string; calls: string }>(`
          SELECT feature, SUM(cost_usd)::text AS total, COUNT(*)::text AS calls
            FROM ai_usage WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='success'
            GROUP BY feature ORDER BY SUM(cost_usd) DESC LIMIT 20
        `),
        pool.query<{ model: string; provider: string; total: string; calls: string }>(`
          SELECT model, provider, SUM(cost_usd)::text AS total, COUNT(*)::text AS calls
            FROM ai_usage WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='success'
            GROUP BY model, provider ORDER BY SUM(cost_usd) DESC LIMIT 20
        `),
        pool.query<{ user_id: number; total: string; calls: string }>(`
          SELECT user_id, SUM(cost_usd)::text AS total, COUNT(*)::text AS calls
            FROM ai_usage
           WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='success' AND user_id IS NOT NULL
           GROUP BY user_id ORDER BY SUM(cost_usd) DESC LIMIT 10
        `),
      ]);

      res.json({
        available: true,
        budgets: {
          dailyUsd: parseFloat(process.env.AI_DAILY_BUDGET_USD || "10"),
          monthlyUsd: parseFloat(process.env.AI_MONTHLY_BUDGET_USD || "200"),
          perUserDailyUsd: parseFloat(process.env.AI_PER_USER_DAILY_USD || "1"),
        },
        totals: Object.fromEntries(totals.rows.map(r => [r.scope, { usd: parseFloat(r.total), calls: parseInt(r.calls) }])),
        byFeature: byFeature.rows.map(r => ({ feature: r.feature, usd: parseFloat(r.total), calls: parseInt(r.calls) })),
        byModel: byModel.rows.map(r => ({ model: r.model, provider: r.provider, usd: parseFloat(r.total), calls: parseInt(r.calls) })),
        topUsers: topUsers.rows.map(r => ({ userId: r.user_id, usd: parseFloat(r.total), calls: parseInt(r.calls) })),
      });
    } catch (err) {
      console.error("ai-cost error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/observability/test-error", requireAdmin, (req, _res, next) => {
    (req as any).log?.warn({ marker: "observability-test" }, "About to throw test error");
    next(new Error("Sentry test error from /api/admin/observability/test-error — safe to ignore"));
  });

  app.post("/api/admin/observability/test-log", requireAdmin, (req, res) => {
    const log = (req as any).log;
    log?.info({ marker: "observability-test", userId: req.session.userId }, "Test log info");
    log?.warn({ marker: "observability-test" }, "Test log warn");
    log?.error({ marker: "observability-test", err: new Error("Logged-only test error") }, "Test log error");
    res.json({ ok: true, traceId: (req as any).id, hint: "Search 'observability-test' in your log aggregator." });
  });

}
