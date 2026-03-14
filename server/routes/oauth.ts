import type { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { storage } from "../storage";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.APP_URL || "https://app.passport2fluency.com"
    : "http://localhost:5000";

// ── Helper: find-or-create user from OAuth profile ──────────────────────────

async function findOrCreateOAuthUser(
  provider: "google" | "microsoft",
  providerId: string,
  email: string,
  firstName: string,
  lastName: string,
  avatar?: string,
) {
  // 1. Existing user by OAuth ID
  const byId =
    provider === "google"
      ? await storage.getUserByGoogleId(providerId)
      : await storage.getUserByMicrosoftId(providerId);
  if (byId) return byId;

  // 2. Existing user by email — link OAuth ID
  if (email) {
    const byEmail = await storage.getUserByEmail(email);
    if (byEmail) {
      await storage.linkOAuthId(byEmail.id, provider, providerId);
      return byEmail;
    }
  }

  // 3. Create new user
  const username = email
    ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") + "_" + Date.now().toString().slice(-4)
    : `${provider}_${providerId.slice(0, 8)}`;

  const newUser = await storage.createUser({
    username,
    email: email || `${provider}_${providerId}@noemail.local`,
    password: undefined as any, // OAuth users have no password
    firstName: firstName || "User",
    lastName: lastName || "",
    userType: "lead",
    trialCompleted: false,
    classCredits: 1,
    level: "A1",
    avatar: avatar || null,
  });

  await storage.linkOAuthId(newUser.id, provider, providerId);
  return newUser;
}

// ── Passport Strategies ──────────────────────────────────────────────────────

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || "";
          const avatar = profile.photos?.[0]?.value;
          const user = await findOrCreateOAuthUser(
            "google",
            profile.id,
            email,
            profile.name?.givenName || profile.displayName || "",
            profile.name?.familyName || "",
            avatar,
          );
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;

if (microsoftClientId && microsoftClientSecret) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: microsoftClientId,
        clientSecret: microsoftClientSecret,
        callbackURL: `${BASE_URL}/api/auth/microsoft/callback`,
        scope: ["user.read"],
      } as any,
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email =
            profile.emails?.[0]?.value ||
            profile._json?.mail ||
            profile._json?.userPrincipalName ||
            "";
          const user = await findOrCreateOAuthUser(
            "microsoft",
            profile.id,
            email,
            profile.name?.givenName || profile.displayName || "",
            profile.name?.familyName || "",
          );
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

// ── Routes ───────────────────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {
  // Google
  app.get("/api/auth/google", (req, res, next) => {
    if (!googleClientId) {
      return res.redirect("/login?error=google_not_configured");
    }
    passport.authenticate("google", { session: false })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: any) => {
      passport.authenticate("google", { session: false }, async (err: any, user: any) => {
        if (err || !user) {
          console.error("[oauth] Google callback error:", err?.message);
          return res.redirect("/login?error=oauth_failed");
        }
        (req.session as any).userId = user.id;
        await new Promise<void>((resolve, reject) =>
          req.session.save((e) => (e ? reject(e) : resolve())),
        );
        res.redirect(getSmartRedirect(user));
      })(req, res, next);
    },
  );

  // Microsoft
  app.get("/api/auth/microsoft", (req, res, next) => {
    if (!microsoftClientId) {
      return res.redirect("/login?error=microsoft_not_configured");
    }
    passport.authenticate("microsoft", { session: false })(req, res, next);
  });

  app.get(
    "/api/auth/microsoft/callback",
    (req: Request, res: Response, next: any) => {
      passport.authenticate("microsoft", { session: false }, async (err: any, user: any) => {
        if (err || !user) {
          console.error("[oauth] Microsoft callback error:", err?.message);
          return res.redirect("/login?error=oauth_failed");
        }
        (req.session as any).userId = user.id;
        await new Promise<void>((resolve, reject) =>
          req.session.save((e) => (e ? reject(e) : resolve())),
        );
        res.redirect(getSmartRedirect(user));
      })(req, res, next);
    },
  );
}

function getSmartRedirect(user: { userType: string; trialCompleted: boolean | null }): string {
  if (user.userType === "admin") return "/admin";
  if (user.userType === "tutor") return "/tutor-portal";
  if (user.userType === "customer") return "/dashboard";
  if (user.trialCompleted) return "/packages";
  return "/home";
}
