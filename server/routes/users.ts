import type { Express } from "express";
import { storage, sanitizeUser } from "../storage";
import { requireAuth } from "./auth";

export function registerUserRoutes(app: Express) {
  // Get user by ID
  app.get("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ownership check: users can only access their own data (admins can access any)
      const requestingUser = await storage.getUser(req.session.userId!);
      if (req.session.userId !== userId && requestingUser?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: you can only access your own data" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        level: user.level,
        avatar: user.avatar,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user
  app.put("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ownership check: users can only update their own data (admins can update any)
      const requestingUser = await storage.getUser(req.session.userId!);
      if (req.session.userId !== userId && requestingUser?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: you can only update your own data" });
      }

      const { firstName, lastName, phone, password } = req.body;

      const updateData: Record<string, unknown> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (password !== undefined) updateData.password = password;

      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Ownership check: users can only access their own dashboard (admins can access any)
      const requestingUser = await storage.getUser(req.session.userId!);
      if (req.session.userId !== userId && requestingUser?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: you can only access your own dashboard" });
      }

      const user = await storage.getUser(userId);
      const subscription = await storage.getUserSubscription(userId);
      const progress = await storage.getUserProgress(userId);
      const upcomingClasses = await storage.getUpcomingClasses(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          level: user.level,
          avatar: user.avatar,
        },
        subscription,
        progress,
        upcomingClasses,
        stats: {
          classesBooked: upcomingClasses.length + (progress?.classesCompleted || 0),
          classesCompleted: progress?.classesCompleted || 0,
          learningHours: progress?.learningHours || "0.00",
          currentLevel: user.level,
          remainingClasses: Math.max((user.classCredits || 0), 0),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Videos
  app.get("/api/videos", async (req, res) => {
    try {
      const { level } = req.query;

      let videos;
      if (level && typeof level === "string") {
        videos = await storage.getVideosByLevel(level);
      } else {
        videos = await storage.getAllVideos();
      }

      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription management
  app.put("/api/subscription/:id", requireAuth, async (req, res) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { planId, status, nextBillingDate } = req.body;

      const updatedSubscription = await storage.updateSubscription(subscriptionId, {
        planId,
        status,
        nextBillingDate,
      });

      if (!updatedSubscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(updatedSubscription);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
