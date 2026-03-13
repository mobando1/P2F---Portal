import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "./auth";

export function registerNotificationRoutes(app: Express) {
  // Get notifications for the logged-in user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get unread count
  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark single notification as read (with ownership check)
  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationRead(id, userId);
      if (!success) return res.status(404).json({ message: "Notification not found or not yours" });
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark all as read
  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
