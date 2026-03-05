import type { Express } from "express";
import { storage } from "../storage";
import { insertClassSchema } from "@shared/schema";
import { HighLevelService } from "../services/high-level";
import { ClassSchedulerService } from "../services/class-scheduler";
import { CalendarIntegrationService } from "../services/calendar-integration";
import { requireAuth } from "./auth";

// Initialize services
const highLevelService =
  process.env.HIGH_LEVEL_API_KEY && process.env.HIGH_LEVEL_LOCATION_ID
    ? new HighLevelService(process.env.HIGH_LEVEL_API_KEY, process.env.HIGH_LEVEL_LOCATION_ID)
    : undefined;

const classScheduler = new ClassSchedulerService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

const calendarService = new CalendarIntegrationService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

export function registerClassRoutes(app: Express) {
  // Get classes for a user
  app.get("/api/classes/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const classes = await storage.getUserClasses(userId);

      // Get tutor info for each class
      const classesWithTutors = await Promise.all(
        classes.map(async (classItem) => {
          const tutor = await storage.getTutor(classItem.tutorId);
          return {
            ...classItem,
            tutorName: tutor?.name || "Unknown Tutor",
          };
        })
      );

      res.json(classesWithTutors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new class
  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);

      // Check if user has remaining classes
      const subscription = await storage.getUserSubscription(classData.userId);
      if (!subscription) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Check user's class credits instead of subscription limits
      const userClassCredits = await storage.getUser(classData.userId);
      if (!userClassCredits || (userClassCredits.classCredits || 0) <= 0) {
        return res.status(400).json({ message: "No remaining class credits available" });
      }

      const newClass = await storage.createClass(classData);

      // Deduct class credit from user instead of updating subscription
      await storage.updateUser(classData.userId, {
        classCredits: (userClassCredits.classCredits || 0) - 1,
      });

      // Send automatic dual notifications and schedule reminders
      try {
        if (highLevelService) {
          const user = await storage.getUser(classData.userId);
          const tutor = await storage.getTutor(classData.tutorId);

          if (user && tutor) {
            await highLevelService.sendClassBookingConfirmation(user, newClass, tutor);
            console.log(`Confirmaciones duales enviadas: ${user.email} y ${tutor.email}`);

            classScheduler.scheduleClassReminder(user, newClass, tutor);
            console.log(`Recordatorio programado para ${new Date(newClass.scheduledAt).toLocaleString()}`);
          }
        }
      } catch (notificationError) {
        console.error("Error enviando notificaciones automaticas:", notificationError);
        // Don't fail the booking because of a notification error
      }

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
        classCategory: category || `${tutor.classType}-${tutor.languageTaught}`,
      });

      // Mark trial as used
      await storage.updateUser(userId, {
        trialCompleted: true,
        trialTutorId: tutorId,
      });

      // Send notifications via HighLevel if available
      try {
        if (highLevelService) {
          const user = await storage.getUser(userId);
          if (user && tutor) {
            await highLevelService.sendClassBookingConfirmation(user, trialClass, tutor);
            console.log(`Trial booking confirmations sent: ${user.email} and ${tutor.email}`);
          }
        }
      } catch (notificationError) {
        console.error("Error sending trial notifications:", notificationError);
      }

      res.status(201).json(trialClass);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel a class
  app.put("/api/classes/:id/cancel", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { userId } = req.body;

      // Get class data BEFORE cancelling
      const userClasses = await storage.getUserClasses(userId);
      const classToCancel = userClasses.find((c) => c.id === classId);

      const success = await storage.cancelClass(classId, userId);

      if (!success) {
        return res.status(404).json({ message: "Class not found or not authorized" });
      }

      // Refund the class credit to user
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          classCredits: (user.classCredits || 0) + 1,
        });
      }

      // Send automatic cancellation notifications
      try {
        if (highLevelService && classToCancel) {
          const user = await storage.getUser(userId);
          const tutor = await storage.getTutor(classToCancel.tutorId);

          if (user && tutor) {
            await highLevelService.sendClassCancellation(user, classToCancel, tutor);
            console.log(`Notificaciones de cancelacion enviadas: ${user.email} y ${tutor.email}`);
          }
        }
      } catch (notificationError) {
        console.error("Error enviando notificaciones de cancelacion:", notificationError);
        // Don't fail the cancellation because of a notification error
      }

      res.json({ message: "Class cancelled successfully" });
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

  // Book a class with specific tutor
  app.post("/api/calendar/book", async (req, res) => {
    try {
      const { userId, tutorId, date, startTime, endTime } = req.body;

      if (!userId || !tutorId || !date || !startTime || !endTime) {
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
        res.json({ message: result.message, appointmentId: result.appointmentId });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error booking class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel a class (enhanced version via calendar)
  app.put("/api/calendar/cancel/:classId", async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

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

  // Start the automatic reminder service
  if (process.env.HIGH_LEVEL_API_KEY && process.env.HIGH_LEVEL_LOCATION_ID) {
    classScheduler.startReminderService();
    console.log("Sistema de notificaciones automaticas iniciado");
  }
}
