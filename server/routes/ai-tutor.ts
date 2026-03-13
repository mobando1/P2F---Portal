import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import {
  generateChatResponse,
  generateConversationTitle,
  hasAiAccess,
  SCENARIOS,
  type ChatMessage,
} from "../services/ai-tutor";
import { generateSpeech } from "../services/tts";
import { gamificationService } from "../services/gamification";

const ttsSchema = z.object({
  text: z.string().min(1).max(1000),
  language: z.enum(["spanish", "english"]),
});

const chatSchema = z.object({
  conversationId: z.number().int(),
  message: z.string().min(1).max(5000),
});

const newConversationSchema = z.object({
  language: z.enum(["spanish", "english"]).default("spanish"),
  mode: z.enum(["chat", "voice", "grammar"]).default("chat"),
  scenario: z.string().optional(),
});

export function registerAiTutorRoutes(app: Express) {
  // Create new conversation
  app.post("/api/ai/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = newConversationSchema.parse(req.body);

      const conversation = await storage.createAiConversation({
        userId,
        language: data.language,
        mode: data.mode,
        scenario: data.scenario || null,
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const data = chatSchema.parse(req.body);

      // Check conversation ownership
      const conversation = await storage.getAiConversation(data.conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check AI access (with daily reset)
      let user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      // Reset daily counter if 24h have passed
      if (user.aiMessagesResetAt) {
        const lastReset = new Date(user.aiMessagesResetAt).getTime();
        const now = Date.now();
        if (now - lastReset >= 24 * 60 * 60 * 1000) {
          await storage.resetAiUsage(userId);
          user = await storage.getUser(userId);
          if (!user) return res.status(401).json({ error: "User not found" });
        }
      }

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
        conversation.mode,
        conversation.scenario || undefined
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

      // Auto-save extracted vocabulary — fire and forget
      if (aiResponse.vocabulary && aiResponse.vocabulary.length > 0) {
        Promise.all(
          aiResponse.vocabulary.map(v =>
            storage.saveAiVocabulary({
              userId,
              messageId: savedMessage.id,
              word: v.word,
              translation: v.translation,
              context: data.message,
              language: conversation.language,
            })
          )
        ).catch(err => console.error("Vocabulary save error:", err));
      }

      // Increment usage for free users
      if (!access.isSubscribed) {
        await storage.incrementAiUsage(userId);
      }

      // Auto-generate title after first exchange
      if (history.length <= 1) {
        const title = await generateConversationTitle(data.message, conversation.language);
        await storage.updateAiConversationTitle(data.conversationId, title);
      }

      // Update student profile (streak, stats) — fire and forget
      updateStudentProfile(userId).catch(err => console.error("Profile update error:", err));

      // Check AI gamification achievements — fire and forget
      gamificationService.onAiPractice(userId).catch(err => console.error("Gamification error:", err));

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

  // Text-to-speech
  app.post("/api/ai/tts", requireAuth, async (req, res) => {
    try {
      const data = ttsSchema.parse(req.body);
      const audio = await generateSpeech(data.text, data.language);
      res.set("Content-Type", "audio/mpeg");
      res.send(audio);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      if (error.message?.includes("not configured")) {
        return res.status(501).json({ error: "TTS not configured" });
      }
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // List available scenarios
  app.get("/api/ai/scenarios", requireAuth, (_req, res) => {
    res.json(
      SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        level: s.level,
        category: s.category,
      }))
    );
  });

  // Get student progress stats
  app.get("/api/ai/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getAiStudentProfile(userId);
      const stats = await storage.getAiProgressStats(userId);
      res.json({ profile, stats });
    } catch (error) {
      console.error("Error fetching AI progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Save a correction for later review
  app.post("/api/ai/corrections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = z.object({
        messageId: z.number().int().optional(),
        original: z.string().min(1),
        corrected: z.string().min(1),
        explanation: z.string().optional(),
        language: z.enum(["spanish", "english"]).default("spanish"),
      }).parse(req.body);

      const correction = await storage.saveAiCorrection({
        userId,
        messageId: data.messageId || null,
        original: data.original,
        corrected: data.corrected,
        explanation: data.explanation || null,
        language: data.language,
      });
      res.json(correction);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error saving correction:", error);
      res.status(500).json({ error: "Failed to save correction" });
    }
  });

  // Get saved corrections
  app.get("/api/ai/corrections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const corrections = await storage.getAiSavedCorrections(userId);
      res.json(corrections);
    } catch (error) {
      console.error("Error fetching corrections:", error);
      res.status(500).json({ error: "Failed to fetch corrections" });
    }
  });

  // Delete a saved correction
  app.delete("/api/ai/corrections/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const correctionId = parseInt(req.params.id);
      await storage.deleteAiCorrection(correctionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting correction:", error);
      res.status(500).json({ error: "Failed to delete correction" });
    }
  });

  // --- Vocabulary endpoints ---

  // Save a vocabulary word
  app.post("/api/ai/vocabulary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = z.object({
        messageId: z.number().int().optional(),
        word: z.string().min(1),
        translation: z.string().min(1),
        context: z.string().optional(),
        language: z.enum(["spanish", "english"]).default("spanish"),
      }).parse(req.body);

      const vocab = await storage.saveAiVocabulary({
        userId,
        messageId: data.messageId || null,
        word: data.word,
        translation: data.translation,
        context: data.context || null,
        language: data.language,
      });
      res.json(vocab);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error saving vocabulary:", error);
      res.status(500).json({ error: "Failed to save vocabulary" });
    }
  });

  // Get saved vocabulary
  app.get("/api/ai/vocabulary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const vocabulary = await storage.getAiVocabulary(userId);
      res.json(vocabulary);
    } catch (error) {
      console.error("Error fetching vocabulary:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary" });
    }
  });

  // Delete a vocabulary word
  app.delete("/api/ai/vocabulary/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const vocabId = parseInt(req.params.id);
      await storage.deleteAiVocabulary(vocabId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      res.status(500).json({ error: "Failed to delete vocabulary" });
    }
  });

  // Update vocabulary mastery (for flashcard review)
  app.patch("/api/ai/vocabulary/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const vocabId = parseInt(req.params.id);
      const data = z.object({
        mastery: z.number().int().min(0).max(3),
      }).parse(req.body);

      const updated = await storage.updateAiVocabularyMastery(vocabId, userId, data.mastery);
      if (!updated) {
        return res.status(404).json({ error: "Vocabulary word not found" });
      }
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating vocabulary:", error);
      res.status(500).json({ error: "Failed to update vocabulary" });
    }
  });

  // Get usage stats
  app.get("/api/ai/usage", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      // Reset daily counter if 24h have passed
      if (user.aiMessagesResetAt) {
        const lastReset = new Date(user.aiMessagesResetAt).getTime();
        if (Date.now() - lastReset >= 24 * 60 * 60 * 1000) {
          await storage.resetAiUsage(userId);
          user = await storage.getUser(userId);
          if (!user) return res.status(401).json({ error: "User not found" });
        }
      }

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

// Update student profile with streak and stats
async function updateStudentProfile(userId: number) {
  const profile = await storage.getAiStudentProfile(userId);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  let streak = profile?.practiceStreak || 0;
  const lastPractice = profile?.lastPracticeDate;

  if (lastPractice) {
    const lastDate = new Date(lastPractice).toISOString().slice(0, 10);
    if (lastDate === today) {
      // Already practiced today, no streak change
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      if (lastDate === yesterdayStr) {
        streak += 1; // Consecutive day
      } else {
        streak = 1; // Streak broken, restart
      }
    }
  } else {
    streak = 1; // First practice ever
  }

  await storage.upsertAiStudentProfile(userId, {
    practiceStreak: streak,
    lastPracticeDate: now,
    totalMessages: (profile?.totalMessages || 0) + 1,
  });
}
