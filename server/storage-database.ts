import bcrypt from "bcryptjs";
import {
  users, tutors, classes, subscriptions, videos, userProgress, contactSubmissions, reviews,
  aiConversations, aiMessages,
  type User, type InsertUser, type Tutor, type InsertTutor,
  type Class, type InsertClass, type Subscription, type InsertSubscription,
  type Video, type InsertVideo, type UserProgress, type InsertUserProgress,
  type ContactSubmission, type InsertContactSubmission,
  type Review, type InsertReview,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage
} from "@shared/schema";
import { db as maybeDb } from "./db";
import { eq, and, gt, desc, asc, sql } from "drizzle-orm";
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

  async getUserByHighLevelContactId(contactId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.highLevelContactId, contactId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const [user] = await this.db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
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

    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
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
}
