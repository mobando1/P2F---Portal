import type { Express } from "express";
import { google } from "googleapis";
import crypto from "crypto";
import { storage } from "../storage";
import { requireAuth } from "./auth";

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.NODE_ENV === "production" ? "https://your-domain.com" : "http://localhost:5000"}/api/auth/google/callback`;

  if (!clientId || !clientSecret) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function registerGoogleOAuthRoutes(app: Express) {
  // Initiate Google OAuth — redirects tutor to Google consent screen
  app.get("/api/auth/google/connect", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user || user.userType !== "tutor") {
        return res.status(403).json({ message: "Only tutors can connect Google Calendar" });
      }

      const oauth2Client = createOAuth2Client();
      if (!oauth2Client) {
        return res.status(500).json({ message: "Google OAuth not configured" });
      }

      // Generate CSRF state
      const state = crypto.randomBytes(16).toString("hex");
      req.session.googleOAuthState = state;

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        state,
      });

      res.redirect(authUrl);
    } catch (error) {
      console.error("[GoogleOAuth] Error initiating connect:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // OAuth callback — exchanges code for tokens, stores them
  app.get("/api/auth/google/callback", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { code, state } = req.query;

      // Verify CSRF state
      if (!state || state !== req.session.googleOAuthState) {
        return res.redirect("/tutor-dashboard?calendar=error&reason=invalid_state");
      }
      delete req.session.googleOAuthState;

      if (!code || typeof code !== "string") {
        return res.redirect("/tutor-dashboard?calendar=error&reason=no_code");
      }

      const oauth2Client = createOAuth2Client();
      if (!oauth2Client) {
        return res.redirect("/tutor-dashboard?calendar=error&reason=not_configured");
      }

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get tutor's Google email
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();
      const googleEmail = userInfo.email || "unknown";

      // Find the tutor record linked to this user
      const user = await storage.getUser(userId);
      if (!user || user.userType !== "tutor") {
        return res.redirect("/tutor-dashboard?calendar=error&reason=not_tutor");
      }

      // Find tutor by userId
      const allTutors = await storage.getAllTutors();
      const tutor = allTutors.find(t => t.userId === userId);
      if (!tutor) {
        return res.redirect("/tutor-dashboard?calendar=error&reason=tutor_not_found");
      }

      // Store tokens
      await storage.upsertTutorGoogleToken({
        tutorId: tutor.id,
        googleEmail,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        tokenExpiry: new Date(tokens.expiry_date!),
        googleCalendarId: "primary",
      });

      // Mark calendar as connected
      await storage.updateUser(userId, { calendarConnected: true });

      res.redirect("/tutor-dashboard?calendar=connected");
    } catch (error) {
      console.error("[GoogleOAuth] Callback error:", error);
      res.redirect("/tutor-dashboard?calendar=error&reason=exchange_failed");
    }
  });

  // Disconnect Google Calendar
  app.post("/api/auth/google/disconnect", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const allTutors = await storage.getAllTutors();
      const tutor = allTutors.find(t => t.userId === userId);
      if (!tutor) return res.status(404).json({ message: "Tutor not found" });

      // Try to revoke token
      const token = await storage.getTutorGoogleToken(tutor.id);
      if (token) {
        try {
          const oauth2Client = createOAuth2Client();
          if (oauth2Client) {
            oauth2Client.setCredentials({ access_token: token.accessToken });
            await oauth2Client.revokeToken(token.accessToken);
          }
        } catch {
          // Revocation failure is not critical
        }
        await storage.deleteTutorGoogleToken(tutor.id);
      }

      await storage.updateUser(userId, { calendarConnected: false });

      res.json({ message: "Google Calendar disconnected" });
    } catch (error) {
      console.error("[GoogleOAuth] Disconnect error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check connection status
  app.get("/api/auth/google/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allTutors = await storage.getAllTutors();
      const tutor = allTutors.find(t => t.userId === userId);

      if (!tutor) {
        return res.json({ connected: false });
      }

      const token = await storage.getTutorGoogleToken(tutor.id);
      res.json({
        connected: !!token,
        googleEmail: token?.googleEmail || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
