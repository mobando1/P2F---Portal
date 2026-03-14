import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { storage, sanitizeUser } from "../storage";
import { loginSchema, insertUserSchema } from "@shared/schema";
import { dripCampaignService } from "../services/drip-campaign";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
    googleOAuthState?: string;
  }
}

// Rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 100 : 10,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate-limited lastActivityAt tracking (max 1 update per hour per user)
const lastActivityCache = new Map<number, number>();
function trackActivity(userId: number): void {
  const now = Date.now();
  const lastUpdate = lastActivityCache.get(userId) || 0;
  if (now - lastUpdate > 60 * 60 * 1000) { // 1 hour
    lastActivityCache.set(userId, now);
    storage.updateUser(userId, { lastActivityAt: new Date() } as any).catch(() => {});
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  trackActivity(req.session.userId);
  next();
}

// Admin authorization middleware (must be used after requireAuth)
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.userType !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" });
  }

  next();
}

// Tutor authorization middleware
export async function requireTutor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || (user.userType !== "tutor" && user.userType !== "admin")) {
    return res.status(403).json({ message: "Forbidden: tutor access required" });
  }

  next();
}

export function registerAuthRoutes(app: Express) {
  // Login
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(email, password);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set server-side session
      req.session.userId = user.id;

      // Include tutor profile if user is a tutor
      let tutorProfile = null;
      if (user.userType === "tutor") {
        tutorProfile = await storage.getTutorByUserId(user.id) || null;
      }

      res.json({ user: sanitizeUser(user), tutorProfile });
    } catch (error: any) {
      const msg = error?.message || String(error) || "Unknown error";
      console.error("[login] catch:", msg);
      res.status(400).json({ message: msg });
    }
  });

  // Register
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);

      // Create initial progress
      await storage.updateUserProgress(user.id, {
        classesCompleted: 0,
        learningHours: "0.00",
        currentStreak: 0,
        totalVideosWatched: 0,
      });

      // Set server-side session
      req.session.userId = user.id;

      // Send welcome email (fire-and-forget)
      dripCampaignService.onUserRegistered(user.id);

      res.status(201).json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Session validation
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ user: sanitizeUser(user) });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
}
