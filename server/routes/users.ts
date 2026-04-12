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

      const { firstName, lastName, phone, avatar } = req.body;
      // Note: password changes must go through PUT /api/user/password (validates current password)

      const updateData: Record<string, unknown> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (avatar !== undefined) {
        // Validate base64 image: must be a data URI with image MIME type, max ~5MB decoded
        if (avatar !== null) {
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
        updateData.avatar = avatar;
        updateData.profileImage = avatar;
      }

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
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Resilient data fetching — missing data shouldn't crash the dashboard
      let subscription = null;
      let progress = null;
      let upcomingClasses: any[] = [];
      let recentCompletedClasses: any[] = [];

      try { subscription = await storage.getUserSubscription(userId); } catch (e) { console.error("Dashboard: subscription fetch failed:", e); }
      try {
        progress = await storage.getUserProgress(userId);
        // Auto-create progress if missing (e.g., after re-registration)
        if (!progress) {
          progress = await storage.updateUserProgress(userId, {
            classesCompleted: 0,
            learningHours: "0.00",
            currentStreak: 0,
            totalVideosWatched: 0,
          });
        }
      } catch (e) { console.error("Dashboard: progress fetch failed:", e); }
      try { upcomingClasses = await storage.getUpcomingClasses(userId); } catch (e) { console.error("Dashboard: upcoming classes fetch failed:", e); }
      try { recentCompletedClasses = await storage.getRecentCompletedClasses(userId, 3); } catch (e) { console.error("Dashboard: recent classes fetch failed:", e); }

      // Calculate stats from actual class records (source of truth)
      let allUserClasses: any[] = [];
      try { allUserClasses = await storage.getUserClasses(userId); } catch {}
      const completedClasses = allUserClasses.filter(c => c.status === "completed");
      const scheduledClasses = allUserClasses.filter(c => c.status === "scheduled");
      const actualCompleted = completedClasses.length;
      const actualHours = completedClasses.reduce((sum: number, c: any) => sum + (c.duration || 60), 0) / 60;

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
        recentCompletedClasses,
        stats: {
          classesBooked: scheduledClasses.length + actualCompleted,
          classesCompleted: actualCompleted,
          learningHours: actualHours.toFixed(2),
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

      // Ownership check: verify subscription belongs to requesting user (or admin)
      const subscription = await storage.getUserSubscription(req.session.userId!);
      if (!subscription || subscription.id !== subscriptionId) {
        const requestingUser = await storage.getUser(req.session.userId!);
        if (requestingUser?.userType !== "admin") {
          return res.status(403).json({ message: "Forbidden: you can only manage your own subscription" });
        }
      }

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
