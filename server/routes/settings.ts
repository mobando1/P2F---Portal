import type { Express } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { requireAuth } from "./auth";

export function registerSettingsRoutes(app: Express) {
  // Get user settings (preferences, notification prefs)
  app.get("/api/user/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const notifPrefs = await storage.getNotificationPreferences(userId);

      res.json({
        currency: user.currency || "USD",
        timezone: user.timezone || "America/New_York",
        autoconfirmMode: user.autoconfirmMode || "all",
        calendarConnected: user.calendarConnected || false,
        profileImage: user.profileImage || null,
        notificationPreferences: notifPrefs || {
          emailBooking: true,
          emailCancellation: true,
          emailReminder: true,
          emailMessages: true,
          emailAchievements: true,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user settings
  app.put("/api/user/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currency, timezone, autoconfirmMode, calendarConnected, profileImage } = req.body;

      // Validate enums
      const VALID_AUTOCONFIRM_MODES = ["self_only", "all"];
      const VALID_CURRENCIES = ["USD", "COP", "EUR", "GBP", "MXN", "BRL", "CAD"];

      if (autoconfirmMode !== undefined && !VALID_AUTOCONFIRM_MODES.includes(autoconfirmMode)) {
        return res.status(400).json({ message: `Invalid autoconfirmMode. Must be one of: ${VALID_AUTOCONFIRM_MODES.join(", ")}` });
      }
      if (currency !== undefined && !VALID_CURRENCIES.includes(currency)) {
        return res.status(400).json({ message: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` });
      }

      const updates: any = {};
      if (currency !== undefined) updates.currency = currency;
      if (timezone !== undefined) updates.timezone = timezone;
      if (autoconfirmMode !== undefined) updates.autoconfirmMode = autoconfirmMode;
      if (calendarConnected !== undefined) updates.calendarConnected = calendarConnected;
      if (profileImage !== undefined) updates.profileImage = profileImage;

      if (Object.keys(updates).length > 0) {
        await storage.updateUser(userId, updates);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change password (validates current password)
  app.put("/api/user/password", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.password) {
        return res.status(400).json({ message: "This account uses social login and has no password to change." });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get payment history
  app.get("/api/user/payment-history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const history = await storage.getPaymentHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update notification preferences
  app.put("/api/user/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = req.body;
      const result = await storage.upsertNotificationPreferences(userId, prefs);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete account
  app.delete("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const targetId = parseInt(req.params.id);

      if (userId !== targetId) {
        return res.status(403).json({ message: "Cannot delete another user's account" });
      }

      await storage.deleteUser(targetId);

      // Destroy session
      (req as any).session?.destroy?.(() => {});

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
