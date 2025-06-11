import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertClassSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd set up proper session management here
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          level: user.level,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Create default subscription
      await storage.createSubscription({
        userId: user.id,
        planName: "Basic Plan",
        planType: "basic",
        classesLimit: 4,
        classesUsed: 0,
        price: "19.99",
        status: "active",
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      // Create initial progress
      await storage.updateUserProgress(user.id, {
        classesCompleted: 0,
        learningHours: "0.00",
        currentStreak: 0,
        totalVideosWatched: 0,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          level: user.level,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
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

  // Dashboard data
  app.get("/api/dashboard/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
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
          remainingClasses: subscription ? (subscription.classesLimit || 0) - (subscription.classesUsed || 0) : 0,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutors
  app.get("/api/tutors", async (req, res) => {
    try {
      const tutors = await storage.getAllTutors();
      res.json(tutors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Classes
  app.get("/api/classes/:userId", async (req, res) => {
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

  app.post("/api/classes", async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      
      // Check if user has remaining classes
      const subscription = await storage.getUserSubscription(classData.userId);
      if (!subscription) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      const remainingClasses = (subscription.classesLimit || 0) - (subscription.classesUsed || 0);
      if (remainingClasses <= 0) {
        return res.status(400).json({ message: "No remaining classes in your subscription" });
      }

      const newClass = await storage.createClass(classData);
      
      // Update subscription usage
      await storage.updateSubscription(subscription.id, {
        classesUsed: (subscription.classesUsed || 0) + 1,
      });

      res.status(201).json(newClass);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/classes/:id/cancel", async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { userId } = req.body;
      
      const success = await storage.cancelClass(classId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Class not found or not authorized" });
      }

      // Refund the class to user's subscription
      const subscription = await storage.getUserSubscription(userId);
      if (subscription && (subscription.classesUsed || 0) > 0) {
        await storage.updateSubscription(subscription.id, {
          classesUsed: (subscription.classesUsed || 0) - 1,
        });
      }

      res.json({ message: "Class cancelled successfully" });
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
  app.put("/api/subscription/:id", async (req, res) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { planType, planName, classesLimit, price } = req.body;
      
      const updatedSubscription = await storage.updateSubscription(subscriptionId, {
        planType,
        planName,
        classesLimit,
        price,
      });
      
      if (!updatedSubscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(updatedSubscription);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
