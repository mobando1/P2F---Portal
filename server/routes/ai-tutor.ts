import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import {
  generateChatResponse,
  generateConversationTitle,
  hasAiAccess,
  type ChatMessage,
} from "../services/ai-tutor";

const chatSchema = z.object({
  conversationId: z.number().int(),
  message: z.string().min(1).max(5000),
});

const newConversationSchema = z.object({
  language: z.enum(["spanish", "english"]).default("spanish"),
  mode: z.enum(["chat", "voice", "grammar"]).default("chat"),
});

export function registerAiTutorRoutes(app: Express) {
  // Create new conversation
  app.post("/api/ai/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const data = newConversationSchema.parse(req.body);

      const conversation = await storage.createAiConversation({
        userId,
        language: data.language,
        mode: data.mode,
        title: data.language === "spanish" ? "Nueva Conversación" : "New Conversation",
      });

      res.json(conversation);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // List user conversations
  app.get("/api/ai/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const conversations = await storage.getAiConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages for a conversation
  app.get("/api/ai/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const conversationId = parseInt(req.params.id);

      const conversation = await storage.getAiConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getAiMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message and get AI response
  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const data = chatSchema.parse(req.body);

      // Check conversation ownership
      const conversation = await storage.getAiConversation(data.conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check AI access
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      const access = hasAiAccess(user);
      if (!access.hasAccess) {
        return res.status(403).json({
          error: "AI message limit reached",
          remaining: 0,
          isSubscribed: false,
        });
      }

      // Save user message
      await storage.addAiMessage({
        conversationId: data.conversationId,
        role: "user",
        content: data.message,
      });

      // Get conversation history for context
      const history = await storage.getAiMessages(data.conversationId);
      const chatMessages: ChatMessage[] = history
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Generate AI response
      const aiResponse = await generateChatResponse(
        chatMessages,
        conversation.language,
        conversation.mode
      );

      // Save AI response
      const savedMessage = await storage.addAiMessage({
        conversationId: data.conversationId,
        role: "assistant",
        content: aiResponse.content,
        corrections: aiResponse.corrections && aiResponse.corrections.length > 0
          ? aiResponse.corrections
          : null,
      });

      // Increment usage for free users
      if (!access.isSubscribed) {
        await storage.incrementAiUsage(userId);
      }

      // Auto-generate title after first exchange
      if (history.length <= 1) {
        const title = await generateConversationTitle(data.message, conversation.language);
        await storage.updateAiConversationTitle(data.conversationId, title);
      }

      res.json({
        message: savedMessage,
        remaining: access.isSubscribed ? -1 : access.remaining - 1,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Admin stats — aggregated AI usage across all students
  app.get("/api/ai/admin-stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAiAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching AI admin stats:", error);
      res.status(500).json({ error: "Failed to fetch AI admin stats" });
    }
  });

  // Get usage stats
  app.get("/api/ai/usage", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      const access = hasAiAccess(user);
      res.json({
        messagesUsed: user.aiMessagesUsed || 0,
        remaining: access.remaining,
        isSubscribed: access.isSubscribed,
        limit: access.isSubscribed ? null : 10,
      });
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });
}
