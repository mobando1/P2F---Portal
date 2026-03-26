import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { storage, sanitizeUser } from "../storage";
import { loginSchema, insertUserSchema } from "@shared/schema";
import { dripCampaignService } from "../services/drip-campaign";
import { emailService } from "../services/email";

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

      // Set server-side session and wait for it to persist
      req.session.userId = user.id;
      try {
        await new Promise<void>((resolve, reject) =>
          req.session.save((err) => (err ? reject(err) : resolve()))
        );
      } catch (sessionErr) {
        console.error("[login] session.save failed:", sessionErr);
      }

      // Include tutor profile if user is a tutor
      let tutorProfile = null;
      if (user.userType === "tutor") {
        tutorProfile = await storage.getTutorByUserId(user.id) || null;
      }

      res.json({ user: sanitizeUser(user), tutorProfile });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Register
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Validate required fields are not empty strings
      if (!userData.firstName?.trim()) {
        return res.status(400).json({ message: "First name is required" });
      }
      if (!userData.lastName?.trim()) {
        return res.status(400).json({ message: "Last name is required" });
      }
      if (!userData.username?.trim()) {
        return res.status(400).json({ message: "Username is required" });
      }
      if (!userData.email?.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!userData.password || userData.password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "This email is already registered. Try logging in instead." });
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

      // Generate email verification token and send verification email
      const verificationToken = crypto.randomUUID();
      await storage.updateUser(user.id, { verificationToken } as any);
      const lang = (user as any).timezone?.includes("America") ? "es" : "en";
      emailService.sendVerificationEmail({
        to: user.email,
        name: user.firstName,
        token: verificationToken,
        lang,
      }).catch((err) => console.error("[register] Failed to send verification email:", err));

      // Send welcome email (fire-and-forget)
      dripCampaignService.onUserRegistered(user.id);

      res.status(201).json({ user: sanitizeUser(user) });
    } catch (error: any) {
      console.error("[register] Registration error:", error);

      // Duplicate key constraint (Postgres 23505)
      if (error?.code === "23505" || error?.message?.includes("unique") || error?.message?.includes("duplicate")) {
        const detail = (error?.detail || error?.message || "").toLowerCase();
        if (detail.includes("username")) {
          return res.status(400).json({ message: "Username already taken" });
        }
        return res.status(400).json({ message: "Email already registered" });
      }

      // Zod validation error
      if (error?.issues) {
        const fields = error.issues.map((i: any) => i.path?.[0]).filter(Boolean).join(", ");
        return res.status(400).json({ message: `Missing or invalid fields: ${fields}` });
      }

      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Email verification
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.redirect("/login?error=invalid_token");
    }
    const user = await storage.getUserByVerificationToken(token);
    if (!user) {
      return res.redirect("/login?error=invalid_token");
    }
    await storage.updateUser(user.id, { emailVerified: true, verificationToken: null } as any);
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) console.error("[verify-email] Session save error:", err);
      res.redirect("/home?verified=true");
    });
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

  // Resend verification email
  app.post("/api/auth/resend-verification", authLimiter, async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user as any).emailVerified) return res.status(400).json({ message: "Email already verified" });

    const verificationToken = crypto.randomUUID();
    await storage.updateUser(user.id, { verificationToken } as any);
    const lang = (user as any).preferredLanguage === "es" || user.timezone?.includes("America") ? "es" : "en";
    const sent = await emailService.sendVerificationEmail({
      to: user.email,
      name: user.firstName,
      token: verificationToken,
      lang,
    }).catch((err) => {
      console.error("[resend-verification] Failed:", err);
      return false;
    });

    if (!sent) {
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.json({ message: "Verification email sent" });
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

  // Forgot password — send reset email
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      // Always return success to avoid email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.updateUser(user.id, { resetToken: token, resetTokenExpiresAt: expiresAt } as any);

      const lang: "es" | "en" = ((user as any).preferredLanguage === "es" || user.timezone?.includes("America")) ? "es" : "en";
      emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.firstName,
        token,
        lang,
      }).catch(err => console.error("[forgot-password] Failed to send reset email:", err));

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset password — validate token and set new password
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "Valid token and password (min 6 characters) are required." });
      }

      // Find user by reset token
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find((u: any) =>
        u.resetToken === token && u.resetTokenExpiresAt && new Date(u.resetTokenExpiresAt) > new Date()
      );

      if (!user) {
        return res.status(400).json({ message: "Reset link is invalid or has expired." });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      } as any);

      res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate reset token (for the UI to check before showing the form)
  app.get("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find((u: any) =>
        u.resetToken === token && u.resetTokenExpiresAt && new Date(u.resetTokenExpiresAt) > new Date()
      );

      if (!user) {
        return res.status(404).json({ message: "Reset link is invalid or has expired." });
      }

      res.json({ valid: true, email: user.email });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor invite — validate token (public)
  app.get("/api/auth/tutor-invite/:token", async (req, res) => {
    try {
      const tutor = await storage.getTutorByInviteToken(req.params.token);
      if (!tutor) {
        return res.status(404).json({ message: "Invite link is invalid or has expired." });
      }
      // Only return safe fields
      res.json({ name: tutor.name, email: tutor.email });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutor invite — accept (set password, create user account, link to tutor)
  app.post("/api/auth/tutor-invite/:token/accept", authLimiter, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const tutor = await storage.getTutorByInviteToken(req.params.token);
      if (!tutor) {
        return res.status(404).json({ message: "Invite link is invalid or has expired." });
      }

      // Check if tutor already has a linked user account
      if (tutor.userId) {
        return res.status(400).json({ message: "This invite has already been used." });
      }

      // Parse name into first/last
      const nameParts = tutor.name.trim().split(" ");
      const firstName = nameParts[0] || tutor.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create user account with userType "tutor"
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await storage.createUser({
        email: tutor.email,
        password: hashedPassword,
        firstName,
        lastName,
        username: tutor.email.split("@")[0],
        userType: "tutor",
        emailVerified: true,
        trialCompleted: false,
        classCredits: 0,
      } as any);

      // Link tutor profile to user and clear invite token
      await storage.activateTutorAccount(tutor.id, newUser.id);

      // Auto-login
      req.session.userId = newUser.id;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );

      res.json({ user: sanitizeUser(newUser), tutorProfile: { ...tutor, userId: newUser.id } });
    } catch (error: any) {
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.status(400).json({ message: "An account with this email already exists." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
