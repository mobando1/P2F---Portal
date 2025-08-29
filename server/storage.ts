import { 
  users, tutors, classes, videos, subscriptions, userProgress,
  type User, type InsertUser, type Tutor, type InsertTutor, 
  type Class, type InsertClass, type Video, type InsertVideo,
  type Subscription, type InsertSubscription, type UserProgress, type InsertUserProgress
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByHighLevelContactId(contactId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Auth
  authenticateUser(email: string, password: string): Promise<User | null>;

  // Subscriptions
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Tutors
  getAllTutors(): Promise<Tutor[]>;
  getTutor(id: number): Promise<Tutor | undefined>;
  createTutor(tutor: InsertTutor): Promise<Tutor>;

  // Classes
  getAllClasses(): Promise<Class[]>;
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
  private users: Map<number, User>;
  private tutors: Map<number, Tutor>;
  private classes: Map<number, Class>;
  private videos: Map<number, Video>;
  private subscriptions: Map<number, Subscription>;
  private userProgress: Map<number, UserProgress>;
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
    // Usuario de prueba vinculado con High Level
    const user: User = {
      id: 1,
      username: "juan_sanchez",
      email: "juan.sanchez@example.com", 
      password: "password123",
      firstName: "Juan",
      lastName: "Sánchez",
      phone: "+1-555-0123",
      level: "B1",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 8,
      highLevelContactId: "TEST_CONTACT_123", // Contact ID de prueba para testing
      stripeCustomerId: "cus_test_123",
      createdAt: new Date(),
    };
    this.users.set(1, user);

    // Usuario adicional para pruebas
    const user2: User = {
      id: 2,
      username: "maria_rodriguez", 
      email: "maria.rodriguez@example.com",
      password: "password123",
      firstName: "María",
      lastName: "Rodríguez",
      phone: "+1-555-0124",
      level: "A2",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 12,
      highLevelContactId: "MARIA_CONTACT_456", // Otro Contact ID para testing
      stripeCustomerId: "cus_test_456",
      createdAt: new Date(),
    };
    this.users.set(2, user2);
    this.currentUserId = 3;

    // Sample subscription
    const subscription: Subscription = {
      id: 1,
      userId: 1,
      planId: 1,
      stripeSubscriptionId: "sub_premium_123",
      status: "active",
      nextBillingDate: new Date("2025-01-15"),
      createdAt: new Date(),
    };
    this.subscriptions.set(1, subscription);
    this.currentSubscriptionId = 2;

    // Real tutors from Passport2Fluency
    const tutorData = [
      {
        id: 1,
        name: "Carolina Perilla",
        email: "carolsur191919@gmail.com",
        phone: null,
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "LuoLdvMdaZWRkidLCeQri",
        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish & English Conversation",
        bio: "Native Spanish speaker with extensive experience in bilingual education and conversation practice",
        rating: "4.9",
        reviewCount: 89,
        hourlyRate: "$30.00",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["TEFL Certified", "Native Spanish Speaker"],
        yearsOfExperience: 8,
      },
      {
        id: 2,
        name: "Evelyn Salcedo",
        email: "evelyn@passport2fluency.com",
        phone: null,
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "BrcSUKNCvlqeJUqd8l6",
        createdAt: new Date(),
        isActive: true,
        specialization: "Business Spanish & English",
        bio: "Professional language instructor specializing in business communication and professional development",
        rating: "4.8",
        reviewCount: 156,
        hourlyRate: "$35.00",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["Business English Certified", "Spanish Literature Degree"],
        yearsOfExperience: 10,
      },
      {
        id: 3,
        name: "Felipe Rodriguez",
        email: "coach@passport2fluency.com",
        phone: "(210) 201-4490",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "97rAcKTET2Y8pXmnE7",
        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish Coaching & Fluency",
        bio: "Language coach focused on helping students achieve Spanish fluency through personalized coaching methods",
        rating: "4.9",
        reviewCount: 203,
        hourlyRate: "$40.00",
        country: "USA",
        timezone: "America/Chicago",
        languages: ["Spanish", "English"],
        certifications: ["Certified Language Coach", "Spanish Fluency Specialist"],
        yearsOfExperience: 12,
      },
      {
        id: 4,
        name: "Gloria Cardona",
        email: "gloria@passport2fluency.com",
        phone: "(312) 312-1826",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "FVFbwsXbe6LdJKAJetJye",
        createdAt: new Date(),
        isActive: true,
        specialization: "Advanced Spanish & Grammar",
        bio: "Expert in advanced Spanish grammar and literature with a passion for helping students master complex concepts",
        rating: "4.9",
        reviewCount: 178,
        hourlyRate: "$32.00",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["Spanish Literature Masters", "Advanced Grammar Specialist"],
        yearsOfExperience: 15,
      },
      {
        id: 5,
        name: "Johanna Pacheco",
        email: "johanna@passport2fluency.com",
        phone: null,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "zTpvGMpxRnIM5gKqz3kws",
        createdAt: new Date(),
        isActive: true,
        specialization: "Conversational Spanish & Culture",
        bio: "Cultural specialist who combines language learning with deep cultural understanding for immersive Spanish experience",
        rating: "4.8",
        reviewCount: 134,
        hourlyRate: "$28.00",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["Cultural Studies Specialist", "Conversational Spanish Expert"],
        yearsOfExperience: 9,
      }
    ];

    tutorData.forEach(tutor => {
      this.tutors.set(tutor.id, tutor);
    });
    this.currentTutorId = 6;

    // Clases de prueba con vinculación High Level
    const classData = [
      {
        id: 1,
        userId: 1,
        tutorId: 1,
        title: "Conversation Practice",
        description: "Practice conversational Spanish",
        scheduledAt: new Date("2025-08-30T15:00:00"),
        duration: 60,
        status: "scheduled" as const,
        meetingLink: "https://meet.google.com/abc-defg-hij",
        highLevelAppointmentId: "APPT_TEST_001",
        highLevelContactId: "TEST_CONTACT_123",
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 2,
        tutorId: 2,
        title: "Grammar Intensive",
        description: "Focus on Spanish grammar rules",
        scheduledAt: new Date("2025-08-31T10:00:00"),
        duration: 60,
        status: "scheduled" as const,
        meetingLink: "https://meet.google.com/klm-nopq-rst",
        highLevelAppointmentId: "APPT_TEST_002", 
        highLevelContactId: "MARIA_CONTACT_456",
        createdAt: new Date(),
      },
      {
        id: 3,
        userId: 1,
        tutorId: 3,
        title: "Business Spanish",
        description: "Professional Spanish for work",
        scheduledAt: new Date("2025-09-02T14:00:00"),
        duration: 60,
        status: "completed" as const,
        meetingLink: "https://meet.google.com/uvw-xyza-bcd",
        highLevelAppointmentId: "APPT_TEST_003",
        highLevelContactId: "TEST_CONTACT_123",
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
      },
      {
        id: 4,
        title: "Pronunciation Mastery",
        description: "Perfect your Spanish accent",
        instructor: "Prof. Miguel Ruiz",
        level: "All Levels",
        duration: "15:30",
        thumbnailUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video4.mp4",
        category: "Pronunciation",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 5,
        title: "Cultural Insights",
        description: "Understanding Hispanic cultures",
        instructor: "Prof. Sofia Vargas",
        level: "Intermediate",
        duration: "21:45",
        thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video5.mp4",
        category: "Culture",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 6,
        title: "Advanced Writing",
        description: "Master complex writing structures",
        instructor: "Prof. Eduardo Morales",
        level: "Advanced",
        duration: "28:12",
        thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop",
        videoUrl: "https://example.com/video6.mp4",
        category: "Writing",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    videoData.forEach(video => {
      this.videos.set(video.id, video);
    });
    this.currentVideoId = 7;

    // Sample user progress
    const progress: UserProgress = {
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

  async getUserByHighLevelContactId(contactId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.highLevelContactId === contactId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      level: insertUser.level || "A1",
      avatar: insertUser.avatar || null,
      phone: insertUser.phone || null,
      userType: insertUser.userType || "student",
      trialCompleted: insertUser.trialCompleted || false,
      classCredits: insertUser.classCredits || 0,
      highLevelContactId: insertUser.highLevelContactId || null,
      stripeCustomerId: insertUser.stripeCustomerId || null
    };
    this.users.set(id, user);
    return user;
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

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(sub => sub.stripeSubscriptionId === stripeSubscriptionId);
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const id = this.currentSubscriptionId++;
    const subscription: Subscription = { 
      ...subscriptionData, 
      id, 
      createdAt: new Date(),
      status: subscriptionData.status || "active",
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
      nextBillingDate: subscriptionData.nextBillingDate || null
    };
    this.subscriptions.set(id, subscription);
    return subscription;
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
    const tutor: Tutor = { 
      ...tutorData, 
      id, 
      createdAt: new Date(),
      bio: tutorData.bio || null,
      avatar: tutorData.avatar || null,
      rating: tutorData.rating || "5.00",
      reviewCount: tutorData.reviewCount || 0,
      isActive: tutorData.isActive !== undefined ? tutorData.isActive : true,
      phone: tutorData.phone || null,
      highLevelContactId: tutorData.highLevelContactId || null,
      yearsOfExperience: tutorData.yearsOfExperience || 0,
      country: tutorData.country || null,
      timezone: tutorData.timezone || null,
      hourlyRate: tutorData.hourlyRate || "25.00",
      certifications: tutorData.certifications || [],
      languages: tutorData.languages || []
    };
    this.tutors.set(id, tutor);
    return tutor;
  }

  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getUserClasses(userId: number): Promise<Class[]> {
    return Array.from(this.classes.values())
      .filter(classItem => classItem.userId === userId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async getClass(classId: number): Promise<Class | undefined> {
    return this.classes.get(classId);
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
    const classItem: Class = { 
      ...classData, 
      id, 
      createdAt: new Date(),
      description: classData.description || null,
      duration: classData.duration || 60,
      status: classData.status || "scheduled",
      meetingLink: classData.meetingLink || null
    };
    this.classes.set(id, classItem);
    return classItem;
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
    
    const updatedClass = { ...classItem, status: "cancelled" as const };
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
    const video: Video = { 
      ...videoData, 
      id, 
      createdAt: new Date(),
      description: videoData.description || null,
      thumbnailUrl: videoData.thumbnailUrl || null,
      videoUrl: videoData.videoUrl || null,
      isActive: videoData.isActive !== undefined ? videoData.isActive : true
    };
    this.videos.set(id, video);
    return video;
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
    
    return progress;
  }
}

export const storage = new MemStorage();
