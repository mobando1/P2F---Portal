import { storage } from "../storage";
import type { Achievement } from "@shared/schema";

const CLASS_MILESTONES = [
  { count: 1, type: "first_class", title: "Primera Clase", titleEn: "First Class", icon: "🎉", desc: "Completaste tu primera clase", descEn: "Completed your first class" },
  { count: 5, type: "milestone_5", title: "5 Clases", titleEn: "5 Classes", icon: "⭐", desc: "Completaste 5 clases", descEn: "Completed 5 classes" },
  { count: 10, type: "milestone_10", title: "10 Clases — Dedicado", titleEn: "10 Classes — Dedicated", icon: "🔥", desc: "Completaste 10 clases", descEn: "Completed 10 classes" },
  { count: 20, type: "milestone_20", title: "20 Clases — Imparable", titleEn: "20 Classes — Unstoppable", icon: "🏆", desc: "Completaste 20 clases", descEn: "Completed 20 classes" },
  { count: 50, type: "milestone_50", title: "50 Clases — Leyenda", titleEn: "50 Classes — Legend", icon: "👑", desc: "Completaste 50 clases", descEn: "Completed 50 classes" },
];

const STREAK_MILESTONES = [
  { count: 3, type: "streak_3", title: "Racha de 3 días", titleEn: "3-Day Streak", icon: "🔥", desc: "3 días consecutivos", descEn: "3 consecutive days" },
  { count: 7, type: "streak_7", title: "Racha de 7 días", titleEn: "7-Day Streak", icon: "💪", desc: "7 días consecutivos", descEn: "7 consecutive days" },
  { count: 14, type: "streak_14", title: "Racha de 14 días", titleEn: "14-Day Streak", icon: "⚡", desc: "14 días consecutivos", descEn: "14 consecutive days" },
  { count: 30, type: "streak_30", title: "Racha de 30 días", titleEn: "30-Day Streak", icon: "🌟", desc: "30 días consecutivos", descEn: "30 consecutive days" },
];

export const gamificationService = {
  /**
   * Called when a class is completed — checks and awards milestones
   */
  async onClassCompleted(userId: number): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    try {
      const progress = await storage.getUserProgress(userId);
      const completed = progress?.classesCompleted || 0;
      const streak = progress?.currentStreak || 0;

      // Class milestones
      for (const m of CLASS_MILESTONES) {
        if (completed >= m.count && !(await storage.hasAchievement(userId, m.type))) {
          const a = await storage.createAchievement({
            userId,
            type: m.type,
            title: m.title,
            description: m.desc,
            icon: m.icon,
          });
          newAchievements.push(a);
        }
      }

      // Streak milestones
      for (const s of STREAK_MILESTONES) {
        if (streak >= s.count && !(await storage.hasAchievement(userId, s.type))) {
          const a = await storage.createAchievement({
            userId,
            type: s.type,
            title: s.title,
            description: s.desc,
            icon: s.icon,
          });
          newAchievements.push(a);
        }
      }

      // Create notifications for new achievements
      for (const a of newAchievements) {
        await storage.createNotification({
          userId,
          type: "system",
          title: `${a.icon} ${a.title}`,
          message: a.description,
          link: "/dashboard",
          isRead: false,
        });
      }
    } catch (error) {
      console.error("Error in gamification onClassCompleted:", error);
    }

    return newAchievements;
  },

  /**
   * Called when a review is given
   */
  async onReviewGiven(userId: number): Promise<Achievement | null> {
    try {
      const type = "first_review";
      if (await storage.hasAchievement(userId, type)) return null;

      const a = await storage.createAchievement({
        userId,
        type,
        title: "Primera Reseña",
        description: "Dejaste tu primera reseña",
        icon: "📝",
      });

      await storage.createNotification({
        userId,
        type: "system",
        title: `📝 Primera Reseña`,
        message: "¡Gracias por dejar tu primera reseña!",
        link: "/dashboard",
        isRead: false,
      });

      return a;
    } catch (error) {
      console.error("Error in gamification onReviewGiven:", error);
      return null;
    }
  },
  /**
   * Called after an AI practice message — checks AI-specific achievements
   */
  async onAiPractice(userId: number): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    try {
      const profile = await storage.getAiStudentProfile(userId);
      if (!profile) return newAchievements;

      const totalMessages = profile.totalMessages || 0;
      const streak = profile.practiceStreak || 0;

      const AI_MILESTONES = [
        { count: 1, type: "ai_first_chat", title: "Primera Charla con Lingo", titleEn: "First Chat with Lingo", icon: "🦉", desc: "Tuviste tu primera conversación con Lingo", descEn: "Had your first conversation with Lingo" },
        { count: 10, type: "ai_10_messages", title: "Conversador", titleEn: "Conversationalist", icon: "💬", desc: "Enviaste 10 mensajes a Lingo", descEn: "Sent 10 messages to Lingo" },
        { count: 50, type: "ai_50_messages", title: "Practicante Dedicado", titleEn: "Dedicated Practitioner", icon: "🌟", desc: "Enviaste 50 mensajes a Lingo", descEn: "Sent 50 messages to Lingo" },
        { count: 100, type: "ai_100_messages", title: "Maestro de la Práctica", titleEn: "Practice Master", icon: "👑", desc: "Enviaste 100 mensajes a Lingo", descEn: "Sent 100 messages to Lingo" },
      ];

      const AI_STREAK_MILESTONES = [
        { count: 3, type: "ai_streak_3", title: "Racha Lingo 3 días", titleEn: "Lingo 3-Day Streak", icon: "🔥", desc: "3 días practicando con Lingo", descEn: "3 days practicing with Lingo" },
        { count: 7, type: "ai_streak_7", title: "Racha Lingo 7 días", titleEn: "Lingo 7-Day Streak", icon: "💪", desc: "7 días practicando con Lingo", descEn: "7 days practicing with Lingo" },
        { count: 14, type: "ai_streak_14", title: "Racha Lingo 14 días", titleEn: "Lingo 14-Day Streak", icon: "⚡", desc: "14 días practicando con Lingo", descEn: "14 days practicing with Lingo" },
        { count: 30, type: "ai_streak_30", title: "Racha Lingo 30 días", titleEn: "Lingo 30-Day Streak", icon: "🏆", desc: "30 días practicando con Lingo", descEn: "30 days practicing with Lingo" },
      ];

      // Message milestones
      for (const m of AI_MILESTONES) {
        if (totalMessages >= m.count && !(await storage.hasAchievement(userId, m.type))) {
          const a = await storage.createAchievement({
            userId,
            type: m.type,
            title: m.title,
            description: m.desc,
            icon: m.icon,
          });
          newAchievements.push(a);
        }
      }

      // Streak milestones
      for (const s of AI_STREAK_MILESTONES) {
        if (streak >= s.count && !(await storage.hasAchievement(userId, s.type))) {
          const a = await storage.createAchievement({
            userId,
            type: s.type,
            title: s.title,
            description: s.desc,
            icon: s.icon,
          });
          newAchievements.push(a);
        }
      }

      // Create notifications for new achievements
      for (const a of newAchievements) {
        await storage.createNotification({
          userId,
          type: "system",
          title: `${a.icon} ${a.title}`,
          message: a.description,
          link: "/ai-practice",
          isRead: false,
        });
      }
    } catch (error) {
      console.error("Error in gamification onAiPractice:", error);
    }

    return newAchievements;
  },
};
