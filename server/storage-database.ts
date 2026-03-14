import bcrypt from "bcryptjs";
import {
  users, tutors, classes, subscriptions, videos, userProgress, contactSubmissions, reviews,
  aiConversations, aiMessages, tutorAvailability, tutorAvailabilityExceptions, notifications,
  achievements, supportTickets, supportMessages, conversations, directMessages,
  userNotificationPreferences, classPurchases, emailCampaignEvents,
  type User, type InsertUser, type Tutor, type InsertTutor,
  type Class, type InsertClass, type Subscription, type InsertSubscription,
  type Video, type InsertVideo, type UserProgress, type InsertUserProgress,
  type ContactSubmission, type InsertContactSubmission,
  type Review, type InsertReview,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type TutorAvailability, type InsertTutorAvailability,
  type TutorAvailabilityException, type InsertTutorAvailabilityException,
  type Notification, type InsertNotification,
  type Achievement, type InsertAchievement,
  type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage,
  type Conversation, type InsertConversation,
  type DirectMessage, type InsertDirectMessage,
  type UserNotificationPreferences, type InsertUserNotificationPreferences,
  type ClassPurchase,
  type EmailCampaignEvent,
  crmNotes, crmTasks, crmTags, crmUserTags,
  type CrmNote, type InsertCrmNote,
  type CrmTask, type InsertCrmTask,
  type CrmTag, type InsertCrmTag,
  emailTemplates, audienceSegments, campaigns, campaignRecipients, offers, communicationLog,
  newsletterSubscribers,
  type EmailTemplate, type InsertEmailTemplate,
  type AudienceSegment, type InsertAudienceSegment,
  type Campaign, type InsertCampaign,
  type CampaignRecipient, type InsertCampaignRecipient,
  type Offer, type InsertOffer,
  type CommunicationLogEntry, type InsertCommunicationLog,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  aiStudentProfiles, aiSavedCorrections, aiVocabulary,
  stripeEvents,
  type StripeEvent, type InsertStripeEvent,
  learningPathStations, learningPathContent, studentPathProgress,
  studentQuizAttempts, tutorAssignments, levelProgressionRules,
  type LearningPathStation, type InsertLearningPathStation,
  type LearningPathContent, type InsertLearningPathContent,
  type StudentPathProgress, type InsertStudentPathProgress,
  type StudentQuizAttempt, type InsertStudentQuizAttempt,
  type TutorAssignment, type InsertTutorAssignment,
  type LevelProgressionRule, type InsertLevelProgressionRule,
  tutorGoogleTokens,
  type TutorGoogleToken, type InsertTutorGoogleToken,
} from "@shared/schema";
import { db as maybeDb } from "./db";
import { eq, and, or, not, gt, gte, lte, lt, desc, asc, sql, inArray } from "drizzle-orm";
import type { IStorage } from "./storage";

function getDb() {
  if (!maybeDb) throw new Error("Database not initialized - DATABASE_URL is required");
  return maybeDb;
}

export class DatabaseStorage implements IStorage {
  private get db() { return getDb(); }
  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = insertUser.password
      ? await bcrypt.hash(insertUser.password, 12)
      : null;
    const [user] = await this.db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword } as any)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }
    const [user] = await this.db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (user && user.password && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.microsoftId, microsoftId));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async linkOAuthId(userId: number, provider: 'google' | 'microsoft', providerId: string): Promise<void> {
    const field = provider === 'google' ? { googleId: providerId } : { microsoftId: providerId };
    await this.db.update(users).set(field).where(eq(users.id, userId));
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription || undefined;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription || undefined;
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await this.db
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();
    return subscription;
  }

  async updateSubscription(id: number, subscriptionData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await this.db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription || undefined;
  }

  async getAllTutors(): Promise<Tutor[]> {
    return await this.db.select().from(tutors).where(eq(tutors.isActive, true));
  }

  async getTutor(id: number): Promise<Tutor | undefined> {
    const [tutor] = await this.db.select().from(tutors).where(eq(tutors.id, id));
    return tutor || undefined;
  }

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    const [tutor] = await this.db.select().from(tutors).where(eq(tutors.userId, userId));
    return tutor || undefined;
  }

  async createTutor(tutorData: InsertTutor): Promise<Tutor> {
    const [tutor] = await this.db
      .insert(tutors)
      .values(tutorData)
      .returning();
    return tutor;
  }

  async getTutorsByCategory(classType?: string, languageTaught?: string): Promise<Tutor[]> {
    const conditions = [eq(tutors.isActive, true)];
    if (classType) conditions.push(eq(tutors.classType, classType));
    if (languageTaught) conditions.push(eq(tutors.languageTaught, languageTaught));
    return await this.db.select().from(tutors).where(and(...conditions));
  }

  async updateTutor(id: number, data: Partial<InsertTutor>): Promise<Tutor | undefined> {
    const [tutor] = await this.db
      .update(tutors)
      .set(data)
      .where(eq(tutors.id, id))
      .returning();
    return tutor || undefined;
  }

  async getReviewsByTutor(tutorId: number): Promise<Review[]> {
    return await this.db.select().from(reviews).where(eq(reviews.tutorId, tutorId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await this.db
      .insert(reviews)
      .values(review)
      .returning();
    return newReview;
  }

  async getUserReviewForTutor(userId: number, tutorId: number): Promise<Review | undefined> {
    const [review] = await this.db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.tutorId, tutorId)));
    return review || undefined;
  }

  async hasUsedTrial(userId: number): Promise<boolean> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    return user?.trialCompleted === true;
  }

  async getAllClasses(): Promise<Class[]> {
    return await this.db.select().from(classes);
  }

  async getClassById(id: number): Promise<Class | undefined> {
    const [cls] = await this.db.select().from(classes).where(eq(classes.id, id));
    return cls || undefined;
  }

  async getScheduledClasses(): Promise<Class[]> {
    return await this.db.select().from(classes).where(eq(classes.status, "scheduled"));
  }

  async getUserClasses(userId: number): Promise<Class[]> {
    return await this.db.select().from(classes).where(eq(classes.userId, userId));
  }

  async getUpcomingClasses(userId: number): Promise<Class[]> {
    const now = new Date();
    return await this.db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.userId, userId),
          eq(classes.status, "scheduled"),
          gt(classes.scheduledAt, now)
        )
      );
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [classItem] = await this.db
      .insert(classes)
      .values(classData)
      .returning();
    return classItem;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const [classItem] = await this.db
      .update(classes)
      .set(classData)
      .where(eq(classes.id, id))
      .returning();
    return classItem || undefined;
  }

  async cancelClass(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .update(classes)
      .set({ status: "cancelled" })
      .where(and(eq(classes.id, id), eq(classes.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getAllVideos(): Promise<Video[]> {
    return await this.db.select().from(videos).where(eq(videos.isActive, true));
  }

  async getVideosByLevel(level: string): Promise<Video[]> {
    return await this.db.select().from(videos).where(eq(videos.level, level));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await this.db
      .insert(videos)
      .values(videoData)
      .returning();
    return video;
  }

  async getUserProgress(userId: number): Promise<UserProgress | undefined> {
    const [progress] = await this.db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress || undefined;
  }

  async updateUserProgress(userId: number, progressData: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId);

    if (existing) {
      const [progress] = await this.db
        .update(userProgress)
        .set(progressData)
        .where(eq(userProgress.userId, userId))
        .returning();
      return progress;
    } else {
      const [progress] = await this.db
        .insert(userProgress)
        .values({ userId, ...progressData })
        .returning();
      return progress;
    }
  }

  async createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await this.db
      .insert(contactSubmissions)
      .values(data)
      .returning();
    return submission;
  }

  // AI Practice Partner
  async createAiConversation(data: InsertAiConversation): Promise<AiConversation> {
    const [conv] = await this.db
      .insert(aiConversations)
      .values(data)
      .returning();
    return conv;
  }

  async getAiConversations(userId: number): Promise<AiConversation[]> {
    return await this.db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    const [conv] = await this.db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, id));
    return conv || undefined;
  }

  async getAiMessages(conversationId: number): Promise<AiMessage[]> {
    return await this.db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async addAiMessage(data: InsertAiMessage): Promise<AiMessage> {
    const [message] = await this.db
      .insert(aiMessages)
      .values(data)
      .returning();
    // Update conversation timestamp
    await this.db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, data.conversationId));
    return message;
  }

  async updateAiConversationTitle(id: number, title: string): Promise<void> {
    await this.db
      .update(aiConversations)
      .set({ title })
      .where(eq(aiConversations.id, id));
  }

  async getUserAiUsage(userId: number): Promise<number> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    return user?.aiMessagesUsed || 0;
  }

  async incrementAiUsage(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ aiMessagesUsed: sql`COALESCE(${users.aiMessagesUsed}, 0) + 1` })
      .where(eq(users.id, userId));
  }

  async resetAiUsage(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ aiMessagesUsed: 0, aiMessagesResetAt: new Date() })
      .where(eq(users.id, userId));
  }

  // AI Student Profile & Progress
  async getAiStudentProfile(userId: number): Promise<any> {
    const rows = await this.db.select().from(aiStudentProfiles).where(eq(aiStudentProfiles.userId, userId));
    return rows[0] || null;
  }

  async upsertAiStudentProfile(userId: number, data: any): Promise<any> {
    const existing = await this.getAiStudentProfile(userId);
    if (existing) {
      const [updated] = await this.db.update(aiStudentProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiStudentProfiles.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(aiStudentProfiles)
      .values({ userId, ...data })
      .returning();
    return created;
  }

  async getAiProgressStats(userId: number): Promise<any> {
    // Get conversation counts
    const convos = await this.db.select().from(aiConversations).where(eq(aiConversations.userId, userId));
    const convoIds = convos.map(c => c.id);

    let totalMessages = 0;
    let totalCorrections = 0;
    const allCorrections: any[] = [];

    if (convoIds.length > 0) {
      const msgs = await this.db.select().from(aiMessages)
        .where(and(inArray(aiMessages.conversationId, convoIds), eq(aiMessages.role, "user")));
      totalMessages = msgs.length;

      const corrMsgs = await this.db.select().from(aiMessages)
        .where(and(inArray(aiMessages.conversationId, convoIds), not(sql`${aiMessages.corrections} IS NULL`)));
      for (const m of corrMsgs) {
        const corrs = (m.corrections as any[]) || [];
        allCorrections.push(...corrs);
      }
      totalCorrections = allCorrections.length;
    }

    const errorMap = new Map<string, number>();
    for (const c of allCorrections) {
      if (c.original && c.corrected) {
        const key = `${c.original} → ${c.corrected}`;
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      }
    }
    const topErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    return {
      totalConversations: convos.length,
      totalMessages,
      totalCorrections,
      topErrors,
      languageBreakdown: {
        spanish: convos.filter(c => c.language === "spanish").length,
        english: convos.filter(c => c.language === "english").length,
      },
      modeBreakdown: {
        chat: convos.filter(c => c.mode === "chat").length,
        voice: convos.filter(c => c.mode === "voice").length,
        grammar: convos.filter(c => c.mode === "grammar").length,
      },
    };
  }

  async saveAiCorrection(data: any): Promise<any> {
    const [correction] = await this.db.insert(aiSavedCorrections).values(data).returning();
    return correction;
  }

  async getAiSavedCorrections(userId: number): Promise<any[]> {
    return await this.db.select().from(aiSavedCorrections)
      .where(eq(aiSavedCorrections.userId, userId))
      .orderBy(desc(aiSavedCorrections.createdAt));
  }

  async deleteAiCorrection(id: number, userId: number): Promise<void> {
    await this.db.delete(aiSavedCorrections)
      .where(and(eq(aiSavedCorrections.id, id), eq(aiSavedCorrections.userId, userId)));
  }

  // AI Vocabulary
  async saveAiVocabulary(data: { userId: number; messageId?: number | null; word: string; translation: string; context?: string | null; language: string }): Promise<any> {
    const [vocab] = await this.db.insert(aiVocabulary).values(data).returning();
    return vocab;
  }

  async getAiVocabulary(userId: number): Promise<any[]> {
    return await this.db.select().from(aiVocabulary)
      .where(eq(aiVocabulary.userId, userId))
      .orderBy(desc(aiVocabulary.createdAt));
  }

  async deleteAiVocabulary(id: number, userId: number): Promise<void> {
    await this.db.delete(aiVocabulary)
      .where(and(eq(aiVocabulary.id, id), eq(aiVocabulary.userId, userId)));
  }

  async updateAiVocabularyMastery(id: number, userId: number, mastery: number): Promise<any> {
    const [updated] = await this.db.update(aiVocabulary)
      .set({ mastery, lastReviewedAt: new Date() })
      .where(and(eq(aiVocabulary.id, id), eq(aiVocabulary.userId, userId)))
      .returning();
    return updated || null;
  }

  // Tutor Availability
  async getTutorAvailability(tutorId: number): Promise<TutorAvailability[]> {
    return await this.db.select().from(tutorAvailability)
      .where(and(eq(tutorAvailability.tutorId, tutorId), eq(tutorAvailability.isAvailable, true)));
  }

  async setTutorAvailability(tutorId: number, slots: InsertTutorAvailability[]): Promise<TutorAvailability[]> {
    // Delete existing availability for this tutor
    await this.db.delete(tutorAvailability).where(eq(tutorAvailability.tutorId, tutorId));
    // Insert new slots
    if (slots.length === 0) return [];
    const values = slots.map(s => ({ ...s, tutorId }));
    return await this.db.insert(tutorAvailability).values(values).returning();
  }

  async deleteTutorAvailability(tutorId: number): Promise<void> {
    await this.db.delete(tutorAvailability).where(eq(tutorAvailability.tutorId, tutorId));
  }

  // Availability Exceptions
  async getTutorExceptions(tutorId: number, startDate: Date, endDate: Date): Promise<TutorAvailabilityException[]> {
    return await this.db.select().from(tutorAvailabilityExceptions)
      .where(and(
        eq(tutorAvailabilityExceptions.tutorId, tutorId),
        gte(tutorAvailabilityExceptions.date, startDate),
        lte(tutorAvailabilityExceptions.date, endDate)
      ));
  }

  async createTutorException(exception: InsertTutorAvailabilityException): Promise<TutorAvailabilityException> {
    const [exc] = await this.db.insert(tutorAvailabilityExceptions).values(exception).returning();
    return exc;
  }

  async deleteTutorException(id: number, tutorId?: number): Promise<boolean> {
    const conditions = [eq(tutorAvailabilityExceptions.id, id)];
    if (tutorId !== undefined) conditions.push(eq(tutorAvailabilityExceptions.tutorId, tutorId));
    const result = await this.db.delete(tutorAvailabilityExceptions)
      .where(and(...conditions)).returning();
    return result.length > 0;
  }

  // Conflict Detection
  async getTutorClassesForDate(tutorId: number, date: Date): Promise<Class[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.db.select().from(classes)
      .where(and(
        eq(classes.tutorId, tutorId),
        eq(classes.status, "scheduled"),
        gte(classes.scheduledAt, startOfDay),
        lte(classes.scheduledAt, endOfDay)
      ));
  }

  async checkConflict(tutorId: number, scheduledAt: Date, duration: number): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    // Check for overlapping classes: existing class starts before new ends AND existing class ends after new starts
    const conflicts = await this.db.select().from(classes)
      .where(and(
        eq(classes.tutorId, tutorId),
        eq(classes.status, "scheduled"),
        lt(classes.scheduledAt, endTime),
        gt(sql`${classes.scheduledAt} + interval '1 minute' * ${classes.duration}`, scheduledAt)
      ));
    return conflicts.length > 0;
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return await this.db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await this.db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: number, userId?: number): Promise<boolean> {
    const conditions = [eq(notifications.id, id)];
    if (userId !== undefined) conditions.push(eq(notifications.userId, userId));
    const result = await this.db.update(notifications)
      .set({ isRead: true })
      .where(and(...conditions))
      .returning();
    return result.length > 0;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await this.db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)`.as("count") })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  // Achievements
  async getAchievements(userId: number): Promise<Achievement[]> {
    return await this.db.select().from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.unlockedAt));
  }

  async createAchievement(data: InsertAchievement): Promise<Achievement> {
    const [achievement] = await this.db.insert(achievements).values(data).returning();
    return achievement;
  }

  async hasAchievement(userId: number, type: string): Promise<boolean> {
    const result = await this.db.select().from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.type, type)));
    return result.length > 0;
  }

  // Support Tickets
  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await this.db.insert(supportTickets).values(data).returning();
    return ticket;
  }

  async getSupportTickets(userId?: number): Promise<SupportTicket[]> {
    if (userId) {
      return await this.db.select().from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.updatedAt));
    }
    return await this.db.select().from(supportTickets)
      .orderBy(desc(supportTickets.updatedAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await this.db.select().from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async updateSupportTicket(id: number, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await this.db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async getSupportMessages(ticketId: number): Promise<SupportMessage[]> {
    return await this.db.select().from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(asc(supportMessages.createdAt));
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [message] = await this.db.insert(supportMessages).values(data).returning();
    // Update ticket timestamp
    await this.db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, data.ticketId));
    return message;
  }

  async getAiAdminStats() {
    const allConvs = await this.db.select().from(aiConversations);
    const msgCounts = await this.db
      .select({
        conversationId: aiMessages.conversationId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(aiMessages)
      .groupBy(aiMessages.conversationId);

    const msgCountMap = new Map(msgCounts.map(m => [m.conversationId, Number(m.count)]));
    const userIds = Array.from(new Set(allConvs.map(c => c.userId)));
    const allUsers = userIds.length > 0
      ? await this.db.select().from(users)
      : [];
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const userStats = userIds.map(userId => {
      const user = userMap.get(userId);
      const convs = allConvs.filter(c => c.userId === userId);
      const messageCount = convs.reduce((sum, c) => sum + (msgCountMap.get(c.id) || 0), 0);
      const lastConv = convs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0];
      return {
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        conversationCount: convs.length,
        messageCount,
        lastActive: lastConv?.updatedAt || null,
      };
    });

    const totalMessages = msgCounts.reduce((sum, m) => sum + Number(m.count), 0);

    return {
      totalConversations: allConvs.length,
      totalMessages,
      activeUsers: userIds.length,
      userStats,
    };
  }

  // Direct Messaging
  async getConversations(userId: number) {
    return await this.db.select().from(conversations)
      .where(or(eq(conversations.participantA, userId), eq(conversations.participantB, userId)))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getOrCreateConversation(userA: number, userB: number) {
    const existing = await this.db.select().from(conversations)
      .where(
        or(
          and(eq(conversations.participantA, userA), eq(conversations.participantB, userB)),
          and(eq(conversations.participantA, userB), eq(conversations.participantB, userA))
        )
      );
    if (existing.length > 0) return existing[0];
    const [conv] = await this.db.insert(conversations).values({ participantA: userA, participantB: userB }).returning();
    return conv;
  }

  async getMessages(conversationId: number, limit = 50, offset = 0) {
    return await this.db.select().from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(asc(directMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createMessage(data: InsertDirectMessage) {
    const [msg] = await this.db.insert(directMessages).values(data).returning();
    await this.db.update(conversations).set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, data.conversationId));
    return msg;
  }

  async markMessagesAsRead(conversationId: number, userId: number) {
    await this.db.update(directMessages).set({ isRead: true })
      .where(and(
        eq(directMessages.conversationId, conversationId),
        not(eq(directMessages.senderId, userId)),
        eq(directMessages.isRead, false)
      ));
  }

  async getUnreadMessageCount(userId: number) {
    const convs = await this.getConversations(userId);
    if (convs.length === 0) return 0;
    const convIds = convs.map(c => c.id);
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(directMessages)
      .where(and(
        inArray(directMessages.conversationId, convIds),
        not(eq(directMessages.senderId, userId)),
        eq(directMessages.isRead, false)
      ));
    return Number(result[0]?.count || 0);
  }

  // Notification Preferences
  async getNotificationPreferences(userId: number) {
    const results = await this.db.select().from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));
    return results[0];
  }

  async upsertNotificationPreferences(userId: number, prefs: Partial<InsertUserNotificationPreferences>) {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await this.db.update(userNotificationPreferences)
        .set(prefs).where(eq(userNotificationPreferences.userId, userId)).returning();
      return updated;
    }
    const [created] = await this.db.insert(userNotificationPreferences)
      .values({ userId, ...prefs }).returning();
    return created;
  }

  // Payment History
  async getPaymentHistory(userId: number) {
    return await this.db.select().from(classPurchases)
      .where(eq(classPurchases.userId, userId))
      .orderBy(desc(classPurchases.createdAt));
  }

  // Atomic credit operations
  async deductClassCredit(userId: number): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ classCredits: sql`${users.classCredits} - 1` })
      .where(and(eq(users.id, userId), gt(users.classCredits, 0)))
      .returning();
    return user || undefined;
  }

  async refundClassCredit(userId: number): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ classCredits: sql`COALESCE(${users.classCredits}, 0) + 1` })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Atomic class completion (prevents double-complete)
  async completeClassIfScheduled(classId: number): Promise<Class | undefined> {
    const [cls] = await this.db
      .update(classes)
      .set({ status: "completed" })
      .where(and(eq(classes.id, classId), eq(classes.status, "scheduled")))
      .returning();
    return cls || undefined;
  }

  // Tutor-specific class query (performance)
  async getClassesByTutor(tutorId: number): Promise<Class[]> {
    return await this.db.select().from(classes).where(eq(classes.tutorId, tutorId));
  }

  // Email Campaign Events
  async getEmailCampaignEvents(userId: number): Promise<EmailCampaignEvent[]> {
    return await this.db.select().from(emailCampaignEvents)
      .where(eq(emailCampaignEvents.userId, userId))
      .orderBy(desc(emailCampaignEvents.sentAt));
  }

  async createEmailCampaignEvent(userId: number, step: string): Promise<EmailCampaignEvent> {
    const [event] = await this.db.insert(emailCampaignEvents)
      .values({ userId, campaignStep: step })
      .returning();
    return event;
  }

  // CRM
  async getStudentsCRM(params: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ students: User[]; total: number }> {
    const conditions = [not(eq(users.userType, "admin")), not(eq(users.userType, "tutor"))];
    if (params.status) conditions.push(eq(users.userType, params.status));
    if (params.search) {
      const s = `%${params.search.toLowerCase()}%`;
      conditions.push(or(
        sql`LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE ${s}`,
        sql`LOWER(${users.email}) LIKE ${s}`
      )!);
    }

    const where = and(...conditions);
    const countResult = await this.db.select({ count: sql<number>`count(*)` }).from(users).where(where);
    const total = Number(countResult[0]?.count || 0);

    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const students = await this.db.select().from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { students, total };
  }

  // Delete User (cascading — delete all related data)
  async deleteUser(id: number) {
    await this.db.delete(emailCampaignEvents).where(eq(emailCampaignEvents.userId, id));
    await this.db.delete(notifications).where(eq(notifications.userId, id));
    await this.db.delete(achievements).where(eq(achievements.userId, id));
    await this.db.delete(userProgress).where(eq(userProgress.userId, id));
    await this.db.delete(reviews).where(eq(reviews.userId, id));
    await this.db.delete(userNotificationPreferences).where(eq(userNotificationPreferences.userId, id));
    await this.db.delete(classPurchases).where(eq(classPurchases.userId, id));
    await this.db.delete(subscriptions).where(eq(subscriptions.userId, id));
    await this.db.delete(classes).where(eq(classes.userId, id));
    // Messages: delete messages in conversations, then conversations
    const userConvs = await this.db.select().from(conversations)
      .where(or(eq(conversations.participantA, id), eq(conversations.participantB, id)));
    if (userConvs.length > 0) {
      const convIds = userConvs.map(c => c.id);
      await this.db.delete(directMessages).where(inArray(directMessages.conversationId, convIds));
      await this.db.delete(conversations).where(inArray(conversations.id, convIds));
    }
    // Support
    const userTickets = await this.db.select().from(supportTickets).where(eq(supportTickets.userId, id));
    if (userTickets.length > 0) {
      const ticketIds = userTickets.map(t => t.id);
      await this.db.delete(supportMessages).where(inArray(supportMessages.ticketId, ticketIds));
      await this.db.delete(supportTickets).where(eq(supportTickets.userId, id));
    }
    // AI
    const userAiConvs = await this.db.select().from(aiConversations).where(eq(aiConversations.userId, id));
    if (userAiConvs.length > 0) {
      const aiConvIds = userAiConvs.map(c => c.id);
      await this.db.delete(aiMessages).where(inArray(aiMessages.conversationId, aiConvIds));
      await this.db.delete(aiConversations).where(eq(aiConversations.userId, id));
    }
    // CRM data
    await this.db.delete(crmNotes).where(eq(crmNotes.userId, id));
    await this.db.delete(crmTasks).where(eq(crmTasks.userId, id));
    await this.db.delete(crmUserTags).where(eq(crmUserTags.userId, id));
    // Finally delete user
    await this.db.delete(users).where(eq(users.id, id));
    return true;
  }

  // ── CRM Notes ──
  async getCrmNotes(userId: number): Promise<CrmNote[]> {
    return await this.db.select().from(crmNotes)
      .where(eq(crmNotes.userId, userId))
      .orderBy(desc(crmNotes.createdAt));
  }

  async createCrmNote(data: InsertCrmNote): Promise<CrmNote> {
    const [note] = await this.db.insert(crmNotes).values(data).returning();
    return note;
  }

  async deleteCrmNote(id: number): Promise<boolean> {
    const result = await this.db.delete(crmNotes).where(eq(crmNotes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── CRM Tasks ──
  async getCrmTasks(params: { userId?: number; assignedTo?: number; status?: string }): Promise<CrmTask[]> {
    const conditions = [];
    if (params.userId) conditions.push(eq(crmTasks.userId, params.userId));
    if (params.assignedTo) conditions.push(eq(crmTasks.assignedTo, params.assignedTo));
    if (params.status) conditions.push(eq(crmTasks.status, params.status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return await this.db.select().from(crmTasks)
      .where(where)
      .orderBy(asc(crmTasks.dueDate));
  }

  async createCrmTask(data: InsertCrmTask): Promise<CrmTask> {
    const [task] = await this.db.insert(crmTasks).values(data).returning();
    return task;
  }

  async updateCrmTask(id: number, data: Partial<InsertCrmTask & { status: string; completedAt: Date | null }>): Promise<CrmTask | undefined> {
    const [task] = await this.db.update(crmTasks).set(data).where(eq(crmTasks.id, id)).returning();
    return task;
  }

  async deleteCrmTask(id: number): Promise<boolean> {
    const result = await this.db.delete(crmTasks).where(eq(crmTasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── CRM Tags ──
  async getAllCrmTags(): Promise<CrmTag[]> {
    return await this.db.select().from(crmTags).orderBy(asc(crmTags.name));
  }

  async createCrmTag(data: InsertCrmTag): Promise<CrmTag> {
    const [tag] = await this.db.insert(crmTags).values(data).returning();
    return tag;
  }

  async deleteCrmTag(id: number): Promise<boolean> {
    await this.db.delete(crmUserTags).where(eq(crmUserTags.tagId, id));
    const result = await this.db.delete(crmTags).where(eq(crmTags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserCrmTags(userId: number): Promise<CrmTag[]> {
    const rows = await this.db
      .select({ tag: crmTags })
      .from(crmUserTags)
      .innerJoin(crmTags, eq(crmUserTags.tagId, crmTags.id))
      .where(eq(crmUserTags.userId, userId));
    return rows.map(r => r.tag);
  }

  async addUserCrmTag(userId: number, tagId: number): Promise<void> {
    await this.db.insert(crmUserTags).values({ userId, tagId }).onConflictDoNothing();
  }

  async removeUserCrmTag(userId: number, tagId: number): Promise<void> {
    await this.db.delete(crmUserTags)
      .where(and(eq(crmUserTags.userId, userId), eq(crmUserTags.tagId, tagId)));
  }

  // ── CRM Funnel Metrics ──
  async getCrmFunnel(): Promise<{ stage: string; count: number }[]> {
    const result = await this.db
      .select({
        stage: users.userType,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(not(eq(users.userType, "admin")), not(eq(users.userType, "tutor"))))
      .groupBy(users.userType);
    return result.map(r => ({ stage: r.stage, count: Number(r.count) }));
  }

  // ===== Email Templates =====
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await this.db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await this.db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await this.db.insert(emailTemplates).values(data).returning();
    return template;
  }

  async updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await this.db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    return template;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await this.db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== Audience Segments =====
  async getAudienceSegments(): Promise<AudienceSegment[]> {
    return await this.db.select().from(audienceSegments).orderBy(desc(audienceSegments.createdAt));
  }

  async getAudienceSegment(id: number): Promise<AudienceSegment | undefined> {
    const [segment] = await this.db.select().from(audienceSegments).where(eq(audienceSegments.id, id));
    return segment;
  }

  async createAudienceSegment(data: InsertAudienceSegment): Promise<AudienceSegment> {
    const [segment] = await this.db.insert(audienceSegments).values(data).returning();
    return segment;
  }

  async updateAudienceSegment(id: number, data: Partial<InsertAudienceSegment>): Promise<AudienceSegment | undefined> {
    const [segment] = await this.db.update(audienceSegments).set({ ...data, updatedAt: new Date() }).where(eq(audienceSegments.id, id)).returning();
    return segment;
  }

  async deleteAudienceSegment(id: number): Promise<boolean> {
    const result = await this.db.delete(audienceSegments).where(eq(audienceSegments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== Campaigns =====
  async getCampaigns(): Promise<Campaign[]> {
    return await this.db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await this.db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<InsertCampaign & { status: string; sentAt: Date }>): Promise<Campaign | undefined> {
    const [campaign] = await this.db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id)).returning();
    return campaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    // Only delete draft campaigns
    const result = await this.db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.status, "draft")));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== Campaign Recipients =====
  async getCampaignRecipients(campaignId: number): Promise<CampaignRecipient[]> {
    return await this.db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
  }

  async createCampaignRecipient(data: InsertCampaignRecipient): Promise<CampaignRecipient> {
    const [recipient] = await this.db.insert(campaignRecipients).values(data).returning();
    return recipient;
  }

  async updateCampaignRecipient(id: number, data: Partial<CampaignRecipient>): Promise<void> {
    await this.db.update(campaignRecipients).set(data as any).where(eq(campaignRecipients.id, id));
  }

  async getRecipientByResendId(resendMessageId: string): Promise<CampaignRecipient | undefined> {
    const [recipient] = await this.db.select().from(campaignRecipients)
      .where(eq(campaignRecipients.resendMessageId, resendMessageId));
    return recipient;
  }

  async incrementCampaignOpened(campaignId: number): Promise<void> {
    await this.db.update(campaigns)
      .set({ totalOpened: sql`${campaigns.totalOpened} + 1` })
      .where(eq(campaigns.id, campaignId));
  }

  async incrementCampaignClicked(campaignId: number): Promise<void> {
    await this.db.update(campaigns)
      .set({ totalClicked: sql`${campaigns.totalClicked} + 1` })
      .where(eq(campaigns.id, campaignId));
  }

  // ===== Offers =====
  async getOffers(): Promise<Offer[]> {
    return await this.db.select().from(offers).orderBy(desc(offers.createdAt));
  }

  async getOffer(id: number): Promise<Offer | undefined> {
    const [offer] = await this.db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOfferByCode(code: string): Promise<Offer | undefined> {
    const [offer] = await this.db.select().from(offers).where(eq(offers.code, code));
    return offer;
  }

  async getOfferByStripePromotionCodeId(promoCodeId: string): Promise<Offer | undefined> {
    const [offer] = await this.db.select().from(offers)
      .where(eq(offers.stripePromotionCodeId, promoCodeId));
    return offer;
  }

  async createOffer(data: InsertOffer): Promise<Offer> {
    const [offer] = await this.db.insert(offers).values(data).returning();
    return offer;
  }

  async updateOffer(id: number, data: Partial<Offer>): Promise<Offer | undefined> {
    const [offer] = await this.db.update(offers).set(data as any).where(eq(offers.id, id)).returning();
    return offer;
  }

  async deleteOffer(id: number): Promise<boolean> {
    const result = await this.db.delete(offers).where(eq(offers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementOfferUsage(id: number): Promise<void> {
    await this.db.update(offers).set({ usedCount: sql`${offers.usedCount} + 1` }).where(eq(offers.id, id));
  }

  // ===== Communication Log =====
  async getCommunicationLog(userId: number): Promise<CommunicationLogEntry[]> {
    return await this.db.select().from(communicationLog)
      .where(eq(communicationLog.userId, userId))
      .orderBy(desc(communicationLog.createdAt));
  }

  async createCommunicationLog(data: InsertCommunicationLog): Promise<CommunicationLogEntry> {
    const [entry] = await this.db.insert(communicationLog).values(data).returning();
    return entry;
  }

  // ===== Newsletter Subscribers =====
  async getNewsletterSubscribers(filters?: { status?: string; source?: string; search?: string }): Promise<{ subscribers: NewsletterSubscriber[]; total: number; metrics: any }> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(newsletterSubscribers.status, filters.status));
    if (filters?.source) conditions.push(eq(newsletterSubscribers.source, filters.source));

    const allSubs = conditions.length > 0
      ? await this.db.select().from(newsletterSubscribers).where(and(...conditions)).orderBy(desc(newsletterSubscribers.subscribedAt))
      : await this.db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));

    let filtered = allSubs;
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = allSubs.filter(sub =>
        sub.email.toLowerCase().includes(s) ||
        (sub.firstName && sub.firstName.toLowerCase().includes(s)) ||
        (sub.lastName && sub.lastName.toLowerCase().includes(s))
      );
    }

    const metrics = {
      total: allSubs.length,
      active: allSubs.filter(s => s.status === 'active').length,
      unsubscribed: allSubs.filter(s => s.status === 'unsubscribed').length,
      bounced: allSubs.filter(s => s.status === 'bounced').length,
      bySource: {
        website: allSubs.filter(s => s.source === 'website').length,
        contact_form: allSubs.filter(s => s.source === 'contact_form').length,
        checkout: allSubs.filter(s => s.source === 'checkout').length,
        manual: allSubs.filter(s => s.source === 'manual').length,
      },
    };

    return { subscribers: filtered, total: filtered.length, metrics };
  }

  async createNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [sub] = await this.db.insert(newsletterSubscribers).values(data).returning();
    return sub;
  }

  async upsertNewsletterSubscriber(data: InsertNewsletterSubscriber & { userId?: number }): Promise<NewsletterSubscriber> {
    const existing = await this.db.select().from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, data.email));

    if (existing.length > 0) {
      if (existing[0].status === 'unsubscribed') {
        // Don't re-subscribe automatically
        return existing[0];
      }
      const [updated] = await this.db.update(newsletterSubscribers)
        .set({ firstName: data.firstName, lastName: data.lastName, userId: data.userId ?? existing[0].userId })
        .where(eq(newsletterSubscribers.email, data.email))
        .returning();
      return updated;
    }

    const [sub] = await this.db.insert(newsletterSubscribers).values(data as any).returning();
    return sub;
  }

  async unsubscribeNewsletter(email: string): Promise<void> {
    await this.db.update(newsletterSubscribers)
      .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));
  }

  async deleteNewsletterSubscriber(id: number): Promise<boolean> {
    const result = await this.db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createStripeEvent(data: InsertStripeEvent): Promise<StripeEvent> {
    const [event] = await this.db.insert(stripeEvents).values(data).returning();
    return event;
  }

  async getStripeEvents(eventType?: string, from?: Date, to?: Date): Promise<StripeEvent[]> {
    const conditions = [];
    if (eventType) conditions.push(eq(stripeEvents.eventType, eventType));
    if (from) conditions.push(gte(stripeEvents.createdAt, from));
    if (to) conditions.push(lte(stripeEvents.createdAt, to));

    if (conditions.length === 0) {
      return await this.db.select().from(stripeEvents).orderBy(desc(stripeEvents.createdAt));
    }
    return await this.db.select().from(stripeEvents)
      .where(and(...conditions))
      .orderBy(desc(stripeEvents.createdAt));
  }

  async getClassPurchaseByPaymentIntent(paymentIntentId: string): Promise<ClassPurchase | undefined> {
    const [purchase] = await this.db.select().from(classPurchases)
      .where(eq(classPurchases.stripePaymentIntentId, paymentIntentId));
    return purchase;
  }

  async updateClassPurchase(id: number, data: Partial<ClassPurchase>): Promise<ClassPurchase | undefined> {
    const [updated] = await this.db.update(classPurchases).set(data).where(eq(classPurchases.id, id)).returning();
    return updated;
  }

  // ===== Learning Path =====

  async getStationsByLevel(level: string): Promise<LearningPathStation[]> {
    return await this.db.select().from(learningPathStations)
      .where(eq(learningPathStations.level, level))
      .orderBy(asc(learningPathStations.stationOrder));
  }

  async getStation(id: number): Promise<LearningPathStation | undefined> {
    const [station] = await this.db.select().from(learningPathStations)
      .where(eq(learningPathStations.id, id));
    return station || undefined;
  }

  async getAllStations(): Promise<LearningPathStation[]> {
    return await this.db.select().from(learningPathStations)
      .orderBy(asc(learningPathStations.level), asc(learningPathStations.stationOrder));
  }

  async createStation(data: InsertLearningPathStation): Promise<LearningPathStation> {
    const [station] = await this.db.insert(learningPathStations).values(data).returning();
    return station;
  }

  async deleteStation(id: number): Promise<void> {
    // Delete content first (cascade)
    await this.db.delete(learningPathContent).where(eq(learningPathContent.stationId, id));
    await this.db.delete(learningPathStations).where(eq(learningPathStations.id, id));
  }

  async getContentByStation(stationId: number): Promise<LearningPathContent[]> {
    return await this.db.select().from(learningPathContent)
      .where(eq(learningPathContent.stationId, stationId))
      .orderBy(asc(learningPathContent.sortOrder));
  }

  async getContent(id: number): Promise<LearningPathContent | undefined> {
    const [content] = await this.db.select().from(learningPathContent)
      .where(eq(learningPathContent.id, id));
    return content || undefined;
  }

  async createContent(data: InsertLearningPathContent): Promise<LearningPathContent> {
    const [content] = await this.db.insert(learningPathContent).values(data).returning();
    return content;
  }

  async updateContent(id: number, data: Partial<InsertLearningPathContent>): Promise<LearningPathContent> {
    const [content] = await this.db.update(learningPathContent).set(data)
      .where(eq(learningPathContent.id, id)).returning();
    return content;
  }

  async deleteContent(id: number): Promise<void> {
    await this.db.delete(learningPathContent).where(eq(learningPathContent.id, id));
  }

  async getStudentProgress(userId: number): Promise<StudentPathProgress[]> {
    return await this.db.select().from(studentPathProgress)
      .where(eq(studentPathProgress.userId, userId));
  }

  async getStudentStationProgress(userId: number, stationId: number): Promise<StudentPathProgress | undefined> {
    const [progress] = await this.db.select().from(studentPathProgress)
      .where(and(
        eq(studentPathProgress.userId, userId),
        eq(studentPathProgress.stationId, stationId),
      ));
    return progress || undefined;
  }

  async upsertStudentProgress(data: InsertStudentPathProgress): Promise<StudentPathProgress> {
    const existing = await this.getStudentStationProgress(data.userId, data.stationId);
    if (existing) {
      const [updated] = await this.db.update(studentPathProgress)
        .set(data)
        .where(eq(studentPathProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(studentPathProgress).values(data).returning();
    return created;
  }

  async createQuizAttempt(data: InsertStudentQuizAttempt): Promise<StudentQuizAttempt> {
    const [attempt] = await this.db.insert(studentQuizAttempts).values(data).returning();
    return attempt;
  }

  async getQuizAttempts(userId: number, contentId: number): Promise<StudentQuizAttempt[]> {
    return await this.db.select().from(studentQuizAttempts)
      .where(and(
        eq(studentQuizAttempts.userId, userId),
        eq(studentQuizAttempts.contentId, contentId),
      ))
      .orderBy(desc(studentQuizAttempts.createdAt));
  }

  async getQuizAttemptsByUser(userId: number): Promise<StudentQuizAttempt[]> {
    return await this.db.select().from(studentQuizAttempts)
      .where(eq(studentQuizAttempts.userId, userId));
  }

  async createAssignment(data: InsertTutorAssignment): Promise<TutorAssignment> {
    const [assignment] = await this.db.insert(tutorAssignments).values(data).returning();
    return assignment;
  }

  async getAssignmentsForStudent(studentId: number): Promise<TutorAssignment[]> {
    return await this.db.select().from(tutorAssignments)
      .where(eq(tutorAssignments.studentId, studentId))
      .orderBy(desc(tutorAssignments.createdAt));
  }

  async getAssignmentsByTutor(tutorId: number): Promise<TutorAssignment[]> {
    return await this.db.select().from(tutorAssignments)
      .where(eq(tutorAssignments.tutorId, tutorId))
      .orderBy(desc(tutorAssignments.createdAt));
  }

  async updateAssignment(id: number, data: Partial<InsertTutorAssignment>): Promise<TutorAssignment> {
    const [updated] = await this.db.update(tutorAssignments).set(data)
      .where(eq(tutorAssignments.id, id)).returning();
    return updated;
  }

  async getLevelRules(fromLevel: string): Promise<LevelProgressionRule | undefined> {
    const [rule] = await this.db.select().from(levelProgressionRules)
      .where(eq(levelProgressionRules.fromLevel, fromLevel));
    return rule || undefined;
  }

  async getAllLevelRules(): Promise<LevelProgressionRule[]> {
    return await this.db.select().from(levelProgressionRules);
  }

  async upsertLevelRule(data: InsertLevelProgressionRule): Promise<LevelProgressionRule> {
    const existing = await this.getLevelRules(data.fromLevel);
    if (existing) {
      const [updated] = await this.db.update(levelProgressionRules)
        .set(data)
        .where(eq(levelProgressionRules.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(levelProgressionRules).values(data).returning();
    return created;
  }

  // Google OAuth Tokens
  async getTutorGoogleToken(tutorId: number): Promise<TutorGoogleToken | undefined> {
    const [token] = await this.db.select().from(tutorGoogleTokens).where(eq(tutorGoogleTokens.tutorId, tutorId));
    return token;
  }

  async upsertTutorGoogleToken(data: InsertTutorGoogleToken): Promise<TutorGoogleToken> {
    const existing = await this.getTutorGoogleToken(data.tutorId);
    if (existing) {
      const [updated] = await this.db.update(tutorGoogleTokens)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tutorGoogleTokens.tutorId, data.tutorId))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(tutorGoogleTokens).values(data).returning();
    return created;
  }

  async deleteTutorGoogleToken(tutorId: number): Promise<boolean> {
    const result = await this.db.delete(tutorGoogleTokens).where(eq(tutorGoogleTokens.tutorId, tutorId)).returning();
    return result.length > 0;
  }

  async updateTutorGoogleToken(tutorId: number, data: Partial<InsertTutorGoogleToken>): Promise<TutorGoogleToken | undefined> {
    const [updated] = await this.db.update(tutorGoogleTokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tutorGoogleTokens.tutorId, tutorId))
      .returning();
    return updated;
  }
}
