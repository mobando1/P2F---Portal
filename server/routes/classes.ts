import type { Express } from "express";
import { storage } from "../storage";
import { insertClassSchema } from "@shared/schema";
import { CalendarIntegrationService } from "../services/calendar-integration";
import { availabilityService } from "../services/availability";
import { notificationService } from "../services/notification";
import { dripCampaignService } from "../services/drip-campaign";
import { googleMeetService } from "../services/google-meet";
import { requireAuth, requireAdmin } from "./auth";

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
      });

      // Drip campaign: send pre-class tips (fire-and-forget)
      dripCampaignService.onTrialBooked(userId, new Date(scheduledAt));

      res.status(201).json(trialClass);
    } catch (error) {
      console.error("[book-trial] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel a class
  app.put("/api/classes/:id/cancel", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const userId = req.session.userId!; // From session, not body

      // Get class info before cancelling for notifications
      const classInfo = await storage.getClassById(classId);

      // Check 12h rule
      if (classInfo && classInfo.status === "scheduled") {
        const now = new Date();
        const classDate = new Date(classInfo.scheduledAt);
        const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 12) {
          return res.status(400).json({ message: "Cannot cancel within 12 hours of class" });
        }
      }

      const success = await storage.cancelClass(classId, userId);

      if (!success) {
        return res.status(404).json({ message: "Class not found or not authorized" });
      }

      // Delete Google Calendar events if they exist
      if (classInfo?.calendarEventId || classInfo?.tutorCalendarEventId) {
        googleMeetService.deleteCalendarEvent(
          classInfo.calendarEventId || "",
          classInfo.tutorCalendarEventId || undefined,
          classInfo.tutorId
        ).catch(() => {});
      }

      // Refund the class credit to user (atomic)
      await storage.refundClassCredit(userId);

      // Notify
      if (classInfo) {
        notificationService.onClassCancelled({
          studentId: userId,
          tutorId: classInfo.tutorId,
          scheduledAt: new Date(classInfo.scheduledAt),
        });
      }

      res.json({ message: "Class cancelled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
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
      // Allow booking same day (slots in the future), not just tomorrow+
      const cutoff = new Date(now);
      cutoff.setMinutes(cutoff.getMinutes() + 60); // at least 1h from now

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

        const availableSlots = slots.filter(s => s.available);

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

}
