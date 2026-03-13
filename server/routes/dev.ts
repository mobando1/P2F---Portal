import type { Express } from "express";
import { storage } from "../storage";
import { notificationService } from "../services/notification";

/**
 * Development-only routes for testing and debugging.
 * These are only registered when NODE_ENV === 'development'.
 */
export function registerDevRoutes(app: Express) {
  // Safety guard: return early if not in development mode
  if (process.env.NODE_ENV !== "development") {
    console.warn("registerDevRoutes called outside of development mode -- skipping registration");
    return;
  }

  // Health check endpoint
  app.get("/api/dev/health", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const tutors = await storage.getAllTutors();
      const classes = await storage.getAllClasses();

      res.json({
        status: "ok",
        counts: {
          users: users.length,
          tutors: tutors.length,
          classes: classes.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: error.message,
      });
    }
  });

  // Test notification endpoint - simulates a class booking notification
  app.post("/api/dev/test-notification", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const tutors = await storage.getAllTutors();

      if (users.length === 0 || tutors.length === 0) {
        return res.json({
          success: false,
          message: "No users or tutors found to test with",
        });
      }

      const testUser = users[0];
      const testTutor = tutors[0];

      await notificationService.onClassBooked({
        studentId: testUser.id,
        tutorId: testTutor.id,
        classId: 999,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.json({
        success: true,
        message: "Test notification sent",
        details: {
          student: `${testUser.firstName} ${testUser.lastName}`,
          tutor: testTutor.name,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}
