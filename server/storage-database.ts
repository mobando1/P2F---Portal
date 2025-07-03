import { users, tutors, classes, subscriptions, videos, userProgress, type User, type InsertUser, type Tutor, type InsertTutor, type Class, type InsertClass, type Subscription, type InsertSubscription, type Video, type InsertVideo, type UserProgress, type InsertUserProgress } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Auth
  authenticateUser(email: string, password: string): Promise<User | null>;

  // Subscriptions
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Tutors
  getAllTutors(): Promise<Tutor[]>;
  getTutor(id: number): Promise<Tutor | undefined>;
  createTutor(tutor: InsertTutor): Promise<Tutor>;

  // Classes
  getUserClasses(userId: number): Promise<Class[]>;
  getUpcomingClasses(userId: number): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined>;
  cancelClass(id: number, userId: number): Promise<boolean>;

  // Videos
  getAllVideos(): Promise<Video[]>;
  getVideosByLevel(level: string): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;

  // User Progress
  getUserProgress(userId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription || undefined;
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();
    return subscription;
  }

  async updateSubscription(id: number, subscriptionData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription || undefined;
  }

  async getAllTutors(): Promise<Tutor[]> {
    return await db.select().from(tutors).where(eq(tutors.isActive, true));
  }

  async getTutor(id: number): Promise<Tutor | undefined> {
    const [tutor] = await db.select().from(tutors).where(eq(tutors.id, id));
    return tutor || undefined;
  }

  async createTutor(tutorData: InsertTutor): Promise<Tutor> {
    const [tutor] = await db
      .insert(tutors)
      .values(tutorData)
      .returning();
    return tutor;
  }

  async getUserClasses(userId: number): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.userId, userId));
  }

  async getUpcomingClasses(userId: number): Promise<Class[]> {
    const now = new Date();
    return await db
      .select()
      .from(classes)
      .where(eq(classes.userId, userId));
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [classItem] = await db
      .insert(classes)
      .values(classData)
      .returning();
    return classItem;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const [classItem] = await db
      .update(classes)
      .set(classData)
      .where(eq(classes.id, id))
      .returning();
    return classItem || undefined;
  }

  async cancelClass(id: number, userId: number): Promise<boolean> {
    const result = await db
      .update(classes)
      .set({ status: "cancelled" })
      .where(eq(classes.id, id));
    return true;
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.isActive, true));
  }

  async getVideosByLevel(level: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.level, level));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(videoData)
      .returning();
    return video;
  }

  async getUserProgress(userId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress || undefined;
  }

  async updateUserProgress(userId: number, progressData: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId);
    
    if (existing) {
      const [progress] = await db
        .update(userProgress)
        .set(progressData)
        .where(eq(userProgress.userId, userId))
        .returning();
      return progress;
    } else {
      const [progress] = await db
        .insert(userProgress)
        .values({ userId, ...progressData })
        .returning();
      return progress;
    }
  }
}

export const storage = new DatabaseStorage();