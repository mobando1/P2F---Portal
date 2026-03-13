import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "./auth";

const MAX_MESSAGE_LENGTH = 5000;

// Verify that userId is a participant in the conversation
async function isParticipant(convId: number, userId: number): Promise<boolean> {
  const convs = await storage.getConversations(userId);
  return convs.some(c => c.id === convId);
}

export function registerMessageRoutes(app: Express) {
  // Get all conversations for current user
  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const convs = await storage.getConversations(userId);

      const enriched = await Promise.all(
        convs.map(async (conv) => {
          const otherId = conv.participantA === userId ? conv.participantB : conv.participantA;
          const other = await storage.getUser(otherId);
          const unread = await storage.getUnreadMessageCount(userId);

          // Get last message efficiently (1 message, descending)
          const messages = await storage.getMessages(conv.id, 1, 0);
          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

          return {
            id: conv.id,
            participant: {
              id: otherId,
              name: other ? `${other.firstName} ${other.lastName}` : "Unknown",
              avatar: other?.avatar || other?.profileImage || null,
              userType: other?.userType || "customer",
            },
            lastMessage: lastMsg ? { message: lastMsg.message, createdAt: lastMsg.createdAt, senderId: lastMsg.senderId } : null,
            unreadCount: unread,
            lastMessageAt: conv.lastMessageAt,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get messages for a conversation
  app.get("/api/messages/conversations/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const convId = parseInt(req.params.id);

      // Authorization: verify user is a participant
      if (!await isParticipant(convId, userId)) {
        return res.status(403).json({ message: "Forbidden: not a participant in this conversation" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await storage.getMessages(convId, limit, offset);
      await storage.markMessagesAsRead(convId, userId);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send a message in an existing conversation
  app.post("/api/messages/conversations/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const convId = parseInt(req.params.id);
      const { message } = req.body;

      // Authorization: verify user is a participant
      if (!await isParticipant(convId, userId)) {
        return res.status(403).json({ message: "Forbidden: not a participant in this conversation" });
      }

      if (!message?.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      }

      const msg = await storage.createMessage({
        conversationId: convId,
        senderId: userId,
        message: message.trim(),
      });

      res.status(201).json(msg);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start a new conversation
  app.post("/api/messages/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { recipientId, message } = req.body;

      if (!recipientId || !message?.trim()) {
        return res.status(400).json({ message: "recipientId and message are required" });
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      }

      const conv = await storage.getOrCreateConversation(userId, recipientId);
      const msg = await storage.createMessage({
        conversationId: conv.id,
        senderId: userId,
        message: message.trim(),
      });

      res.status(201).json({ conversation: conv, message: msg });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark messages as read
  app.put("/api/messages/conversations/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const convId = parseInt(req.params.id);

      // Authorization: verify user is a participant
      if (!await isParticipant(convId, userId)) {
        return res.status(403).json({ message: "Forbidden: not a participant in this conversation" });
      }

      await storage.markMessagesAsRead(convId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get unread message count
  app.get("/api/messages/unread", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
