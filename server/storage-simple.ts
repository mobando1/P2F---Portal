import { 
  type User, type InsertUser, type Tutor, type InsertTutor, 
  type Class, type InsertClass, type Video, type InsertVideo,
  type Subscription, type InsertSubscription, type UserProgress, type InsertUserProgress
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private tutors: Map<number, any>;
  private classes: Map<number, any>;
  private videos: Map<number, any>;
  private subscriptions: Map<number, any>;
  private userProgress: Map<number, any>;
  private currentUserId: number;
  private currentTutorId: number;
  private currentClassId: number;
  private currentVideoId: number;
  private currentSubscriptionId: number;
  private currentProgressId: number;

  constructor() {
    this.users = new Map();
    this.tutors = new Map();
    this.classes = new Map();
    this.videos = new Map();
    this.subscriptions = new Map();
    this.userProgress = new Map();
    this.currentUserId = 1;
    this.currentTutorId = 1;
    this.currentClassId = 1;
    this.currentVideoId = 1;
    this.currentSubscriptionId = 1;
    this.currentProgressId = 1;

    this.initializeData();
  }

  private initializeData() {
    // Sample user
    const user = {
      id: 1,
      username: "juan_sanchez",
      email: "juan.sanchez@example.com", 
      password: "password123",
      firstName: "Juan",
      lastName: "Sánchez",
      level: "B1",
      avatar: null,
      createdAt: new Date(),
    };
    this.users.set(1, user);
    this.currentUserId = 2;

    // Sample subscription
    const subscription = {
      id: 1,
      userId: 1,
      planName: "Premium Plan",
      planType: "premium",
      classesLimit: 12,
      classesUsed: 8,
      price: "49.99",
      stripeSubscriptionId: "sub_premium_123",
      status: "active",
      nextBillingDate: new Date("2025-01-15"),
      createdAt: new Date(),
    };
    this.subscriptions.set(1, subscription);
    this.currentSubscriptionId = 2;

    // Sample tutors
    const tutorData = [
      {
        id: 1,
        name: "María Rodríguez",
        email: "maria@example.com",
        specialization: "Conversation & Grammar",
        bio: "Native Spanish speaker with 10+ years of teaching experience",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        rating: "4.9",
        reviewCount: 127,
        hourlyRate: "25.00",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Carmen López",
        email: "carmen@example.com",
        specialization: "Business Spanish",
        bio: "Professional Spanish instructor specialized in business communication",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
        rating: "4.8",
        reviewCount: 89,
        hourlyRate: "30.00",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    tutorData.forEach(tutor => {
      this.tutors.set(tutor.id, tutor);
    });
    this.currentTutorId = 3;

    // Sample classes
    const classData = [
      {
        id: 1,
        userId: 1,
        tutorId: 1,
        title: "Conversation Practice",
        description: "Practice conversational Spanish",
        scheduledAt: new Date("2024-12-18T15:00:00"),
        duration: 60,
        status: "scheduled",
        meetingLink: "https://meet.example.com/abc123",
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        tutorId: 2,
        title: "Grammar Intensive",
        description: "Focus on Spanish grammar rules",
        scheduledAt: new Date("2024-12-20T10:00:00"),
        duration: 60,
        status: "scheduled",
        meetingLink: "https://meet.example.com/def456",
        createdAt: new Date(),
      }
    ];

    classData.forEach(classItem => {
      this.classes.set(classItem.id, classItem);
    });
    this.currentClassId = 3;

    // Sample videos
    const videoData = [
      {
        id: 1,
        title: "Spanish Grammar Basics",
        description: "Master the fundamentals of Spanish grammar",
        instructor: "Prof. Ana García",
        level: "Beginner",
        duration: "24:15",
        thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video1.mp4",
        category: "Grammar",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        title: "Conversation Techniques",
        description: "Improve your speaking confidence",
        instructor: "Prof. Carlos Mendez",
        level: "Intermediate",
        duration: "18:42",
        thumbnailUrl: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video2.mp4",
        category: "Speaking",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        title: "Business Spanish",
        description: "Professional Spanish for the workplace",
        instructor: "Prof. Isabella Torres",
        level: "Advanced",
        duration: "32:08",
        thumbnailUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video3.mp4",
        category: "Business",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    videoData.forEach(video => {
      this.videos.set(video.id, video);
    });
    this.currentVideoId = 4;

    // Sample user progress
    const progress = {
      id: 1,
      userId: 1,
      classesCompleted: 8,
      learningHours: "24.5",
      currentStreak: 5,
      totalVideosWatched: 12,
      updatedAt: new Date(),
    };
    this.userProgress.set(1, progress);
    this.currentProgressId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      level: insertUser.level || "A1",
      avatar: insertUser.avatar || null
    };
    this.users.set(id, user);
    return user as User;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(sub => sub.userId === userId);
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const id = this.currentSubscriptionId++;
    const subscription = { 
      ...subscriptionData, 
      id, 
      createdAt: new Date(),
      status: subscriptionData.status || "active",
      classesLimit: subscriptionData.classesLimit || null,
      classesUsed: subscriptionData.classesUsed || 0,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
      nextBillingDate: subscriptionData.nextBillingDate || null
    };
    this.subscriptions.set(id, subscription);
    return subscription as Subscription;
  }

  async updateSubscription(id: number, subscriptionData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updatedSubscription = { ...subscription, ...subscriptionData };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async getAllTutors(): Promise<Tutor[]> {
    return Array.from(this.tutors.values()).filter(tutor => tutor.isActive);
  }

  async getTutor(id: number): Promise<Tutor | undefined> {
    return this.tutors.get(id);
  }

  async createTutor(tutorData: InsertTutor): Promise<Tutor> {
    const id = this.currentTutorId++;
    const tutor = { 
      ...tutorData, 
      id, 
      createdAt: new Date(),
      bio: tutorData.bio || null,
      avatar: tutorData.avatar || null,
      rating: tutorData.rating || "5.00",
      reviewCount: tutorData.reviewCount || 0,
      isActive: tutorData.isActive !== undefined ? tutorData.isActive : true
    };
    this.tutors.set(id, tutor);
    return tutor as Tutor;
  }

  async getUserClasses(userId: number): Promise<Class[]> {
    return Array.from(this.classes.values())
      .filter(classItem => classItem.userId === userId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async getUpcomingClasses(userId: number): Promise<Class[]> {
    const now = new Date();
    return Array.from(this.classes.values())
      .filter(classItem => 
        classItem.userId === userId && 
        classItem.status === "scheduled" &&
        new Date(classItem.scheduledAt) > now
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.currentClassId++;
    const classItem = { 
      ...classData, 
      id, 
      createdAt: new Date(),
      description: classData.description || null,
      duration: classData.duration || 60,
      status: classData.status || "scheduled",
      meetingLink: classData.meetingLink || null
    };
    this.classes.set(id, classItem);
    return classItem as Class;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const classItem = this.classes.get(id);
    if (!classItem) return undefined;
    
    const updatedClass = { ...classItem, ...classData };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async cancelClass(id: number, userId: number): Promise<boolean> {
    const classItem = this.classes.get(id);
    if (!classItem || classItem.userId !== userId) return false;
    
    const updatedClass = { ...classItem, status: "cancelled" };
    this.classes.set(id, updatedClass);
    return true;
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => video.isActive);
  }

  async getVideosByLevel(level: string): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter(video => video.isActive && (video.level === level || video.level === "All Levels"));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video = { 
      ...videoData, 
      id, 
      createdAt: new Date(),
      description: videoData.description || null,
      thumbnailUrl: videoData.thumbnailUrl || null,
      videoUrl: videoData.videoUrl || null,
      isActive: videoData.isActive !== undefined ? videoData.isActive : true
    };
    this.videos.set(id, video);
    return video as Video;
  }

  async getUserProgress(userId: number): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values()).find(progress => progress.userId === userId);
  }

  async updateUserProgress(userId: number, progressData: Partial<InsertUserProgress>): Promise<UserProgress> {
    let progress = Array.from(this.userProgress.values()).find(p => p.userId === userId);
    
    if (!progress) {
      const id = this.currentProgressId++;
      progress = { 
        id, 
        userId, 
        classesCompleted: 0,
        learningHours: "0.00",
        currentStreak: 0,
        totalVideosWatched: 0,
        updatedAt: new Date(),
        ...progressData 
      };
      this.userProgress.set(id, progress);
    } else {
      const updatedProgress = { ...progress, ...progressData, updatedAt: new Date() };
      this.userProgress.set(progress.id, updatedProgress);
      progress = updatedProgress;
    }
    
    return progress as UserProgress;
  }
}

export const storage = new MemStorage();