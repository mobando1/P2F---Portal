import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "./auth";

export function registerSupportRoutes(app: Express) {
  // Create a support ticket
  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { subject, category, message, priority } = req.body;

      if (!subject || !category || !message) {
        return res.status(400).json({ message: "Subject, category, and message are required" });
      }

      const ticket = await storage.createSupportTicket({
        userId,
        subject,
        category,
        priority: priority || "normal",
      });

      // Create initial message
      await storage.createSupportMessage({
        ticketId: ticket.id,
        userId,
        message,
        isAdmin: false,
      });

      res.status(201).json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tickets (user sees own, admin sees all)
  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) return res.status(404).json({ message: "User not found" });

      const tickets = user.userType === "admin"
        ? await storage.getSupportTickets()
        : await storage.getSupportTickets(userId);

      // Enrich with user name for admin view
      if (user.userType === "admin") {
        const enriched = await Promise.all(
          tickets.map(async (ticket) => {
            const ticketUser = await storage.getUser(ticket.userId);
            return {
              ...ticket,
              userName: ticketUser ? `${ticketUser.firstName} ${ticketUser.lastName}` : "Unknown",
            };
          })
        );
        return res.json(enriched);
      }

      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get ticket detail with messages
  app.get("/api/support/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      // Non-admins can only see their own tickets
      if (user?.userType !== "admin" && ticket.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const messages = await storage.getSupportMessages(ticketId);

      // Enrich messages with user names
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const msgUser = await storage.getUser(msg.userId);
          return {
            ...msg,
            userName: msgUser ? `${msgUser.firstName} ${msgUser.lastName}` : "Support",
          };
        })
      );

      const ticketUser = await storage.getUser(ticket.userId);

      res.json({
        ...ticket,
        userName: ticketUser ? `${ticketUser.firstName} ${ticketUser.lastName}` : "Unknown",
        messages: enrichedMessages,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reply to a ticket
  app.post("/api/support/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const { message } = req.body;
      const user = await storage.getUser(userId);

      if (!message) return res.status(400).json({ message: "Message is required" });

      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      // Non-admins can only reply to their own tickets
      if (user?.userType !== "admin" && ticket.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const isAdmin = user?.userType === "admin";
      const newMessage = await storage.createSupportMessage({
        ticketId,
        userId,
        message,
        isAdmin,
      });

      // If admin replies and ticket is open, set to in_progress
      if (isAdmin && ticket.status === "open") {
        await storage.updateSupportTicket(ticketId, { status: "in_progress" });
      }

      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update ticket status (admin only)
  app.put("/api/support/tickets/:id/status", requireAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateSupportTicket(ticketId, { status });
      if (!updated) return res.status(404).json({ message: "Ticket not found" });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
