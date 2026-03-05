import bcrypt from "bcryptjs";
import {
  users, tutors, classes, videos, subscriptions, userProgress,
  type User, type InsertUser, type Tutor, type InsertTutor,
  type Class, type InsertClass, type Video, type InsertVideo,
  type Subscription, type InsertSubscription, type UserProgress, type InsertUserProgress,
  type ContactSubmission, type InsertContactSubmission,
  type Review, type InsertReview,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage
} from "@shared/schema";

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
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
  getTutorsByCategory(classType?: string, languageTaught?: string): Promise<Tutor[]>;
  createTutor(tutor: InsertTutor): Promise<Tutor>;
  updateTutor(id: number, data: Partial<InsertTutor>): Promise<Tutor | undefined>;

  // Reviews
  getReviewsByTutor(tutorId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  getUserReviewForTutor(userId: number, tutorId: number): Promise<Review | undefined>;

  // Trial
  hasUsedTrial(userId: number): Promise<boolean>;

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

  // Contact Submissions
  createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission>;

  // AI Practice Partner
  createAiConversation(data: InsertAiConversation): Promise<AiConversation>;
  getAiConversations(userId: number): Promise<AiConversation[]>;
  getAiConversation(id: number): Promise<AiConversation | undefined>;
  getAiMessages(conversationId: number): Promise<AiMessage[]>;
  addAiMessage(data: InsertAiMessage): Promise<AiMessage>;
  updateAiConversationTitle(id: number, title: string): Promise<void>;
  getUserAiUsage(userId: number): Promise<number>;
  incrementAiUsage(userId: number): Promise<void>;
  resetAiUsage(userId: number): Promise<void>;

  // AI Admin Stats
  getAiAdminStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    userStats: Array<{
      userId: number;
      userName: string;
      conversationCount: number;
      messageCount: number;
      lastActive: Date | null;
    }>;
  }>;
}

/** Strip password from user object before sending to client */
export function sanitizeUser(user: User): Omit<User, "password"> {
  const { password, ...safeUser } = user;
  return safeUser;
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
  private contactSubmissions: Map<number, ContactSubmission>;
  private currentContactSubmissionId: number;
  private reviewsMap: Map<number, Review>;
  private currentReviewId: number;
  private aiConversationsMap: Map<number, AiConversation>;
  private aiMessagesMap: Map<number, AiMessage>;
  private currentAiConversationId: number;
  private currentAiMessageId: number;
  private initialized: Promise<void>;

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
    this.contactSubmissions = new Map();
    this.currentContactSubmissionId = 1;
    this.reviewsMap = new Map();
    this.currentReviewId = 1;
    this.aiConversationsMap = new Map();
    this.aiMessagesMap = new Map();
    this.currentAiConversationId = 1;
    this.currentAiMessageId = 1;

    this.initialized = this.initializeData();
  }

  private async initializeData() {
    const hashedPassword = await bcrypt.hash("password123", 12);

    // Test user linked with High Level
    const user: User = {
      id: 1,
      username: "juan_sanchez",
      email: "juan.sanchez@example.com",
      password: hashedPassword,
      firstName: "Juan",
      lastName: "Sánchez",
      phone: "+1-555-0123",
      level: "B1",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 8,
      highLevelContactId: "TEST_CONTACT_123",
      trialTutorId: null,
      stripeCustomerId: null,
      aiSubscriptionActive: false,
      aiMessagesUsed: 0,
      aiMessagesResetAt: null,
      createdAt: new Date(),
    };
    this.users.set(1, user);

    const user2: User = {
      id: 2,
      username: "maria_rodriguez",
      email: "maria.rodriguez@example.com",
      password: hashedPassword,
      firstName: "María",
      lastName: "Rodríguez",
      phone: "+1-555-0124",
      level: "A2",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 12,
      highLevelContactId: "MARIA_CONTACT_456",
      trialTutorId: null,
      stripeCustomerId: null,
      aiSubscriptionActive: false,
      aiMessagesUsed: 0,
      aiMessagesResetAt: null,
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
        avatar: "/attached_assets/teachers/carolina-perilla.jpg",
        highLevelContactId: "LuoLdvMdaZWRkidLCeQri",
        highLevelCalendarId: "R5AR05D5vU38A6wUS0R7",
        createdAt: new Date(),
        isActive: true,
        specialization: "Lead Instructor • Bilingual Education",
        bio: "International Relations graduate with a Master's in English Teaching Methodology and 15+ years of experience. Currently pursuing a Doctorate in Educational Sciences. Specializes in bilingual education and cross-cultural communication. Trilingual (Spanish/English C1/French B2).",
        rating: "4.9",
        reviewCount: 156,
        hourlyRate: "$35.00",
        classType: "adults",
        languageTaught: "spanish",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English", "French"],
        certifications: ["M.A. English Teaching Methodology", "Doctorate Student Educational Sciences", "International Relations Graduate"],
        yearsOfExperience: 15,
      },
      {
        id: 2,
        name: "Evelyn Salcedo",
        email: "evelyn@passport2fluency.com",
        phone: null,
        avatar: "/attached_assets/teachers/evelyn-salcedo.jpg",
        highLevelContactId: "BrcSUKNCvlqeJUqd8l6",
        highLevelCalendarId: null,
        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish Language Specialist • Cultural Connection",
        bio: "Passionate about languages and connecting people across cultures. 5+ years of experience teaching Spanish and English to children, youth, and adults. Helps students discover and enjoy Spanish through natural, practical, and fluent learning methods.",
        rating: "4.9",
        reviewCount: 98,
        hourlyRate: "$30.00",
        classType: "adults",
        languageTaught: "spanish",
        country: "Venezuela",
        timezone: "America/Caracas",
        languages: ["Spanish", "English"],
        certifications: ["Cultural Connection Expert", "Natural Language Learning Specialist", "Multi-Age Teaching Certified"],
        yearsOfExperience: 5,
      },
      {
        id: 3,
        name: "Diego Felipe Rodríguez Martínez",
        email: "coach@passport2fluency.com",
        phone: "(210) 201-4490",
        avatar: "/attached_assets/teachers/diego-felipe-rodriguez.jpg",
        highLevelContactId: "97rAcKTET2Y8pXmnE7",
        highLevelCalendarId: null,
        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish Instructor & Education Specialist",
        bio: "Physical Education professor with a Master's in Physical Culture Pedagogy and currently pursuing a PhD in Education. Expert in creating engaging, active learning environments for Spanish instruction with innovative methodologies.",
        rating: "4.8",
        reviewCount: 167,
        hourlyRate: "$32.00",
        classType: "adults",
        languageTaught: "spanish",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["M.A. Physical Culture Pedagogy", "PhD Student in Education", "Spanish & Physical Education Specialist"],
        yearsOfExperience: 8,
      },
      {
        id: 4,
        name: "Gloria Cardona",
        email: "gloria@passport2fluency.com",
        phone: "(312) 312-1826",
        avatar: "/attached_assets/teachers/gloria-cardona.jpg",
        highLevelContactId: "FVFbwsXbe6LdJKAJetJye",
        highLevelCalendarId: null,
        createdAt: new Date(),
        isActive: true,
        specialization: "Children's Specialist • Kids Spanish Expert",
        bio: "Elementary education specialist with 8+ years making Spanish fun for kids. Expert in interactive games and storytelling methods that engage children and make language learning an exciting adventure.",
        rating: "4.9",
        reviewCount: 142,
        hourlyRate: "$28.00",
        classType: "kids",
        languageTaught: "spanish",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["Elementary Education Specialist", "Kids Spanish Expert", "Interactive Learning Specialist"],
        yearsOfExperience: 8,
      },
      {
        id: 5,
        name: "Johanna Pacheco",
        email: "johanna@passport2fluency.com",
        phone: null,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        highLevelContactId: "zTpvGMpxRnIM5gKqz3kws",
        highLevelCalendarId: null,
        createdAt: new Date(),
        isActive: true,
        specialization: "Cultural Immersion Expert • Anthropology",
        bio: "Anthropology graduate from Universidad Nacional specializing in Colombian and Latin American culture. Helps students understand regional dialects, customs, and cultural nuances for authentic Spanish immersion.",
        rating: "4.8",
        reviewCount: 87,
        hourlyRate: "$30.00",
        classType: "adults",
        languageTaught: "spanish",
        country: "Colombia",
        timezone: "America/Bogota",
        languages: ["Spanish", "English"],
        certifications: ["B.A. Anthropology Universidad Nacional", "Cultural Immersion Expert", "Regional Dialects Specialist"],
        yearsOfExperience: 6,
      }
    ];

    tutorData.forEach(tutor => {
      this.tutors.set(tutor.id, tutor);
    });
    this.currentTutorId = 6;

    // Test classes with High Level linking
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
        isTrial: false,
        classCategory: "adults-spanish",
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
        isTrial: false,
        classCategory: "adults-spanish",
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
        isTrial: false,
        classCategory: "adults-spanish",
        meetingLink: "https://meet.google.com/uvw-xyza-bcd",
        highLevelAppointmentId: "APPT_TEST_003",
        highLevelContactId: "TEST_CONTACT_123",
        createdAt: new Date(),
      }
    ];

    classData.forEach(classItem => {
      this.classes.set(classItem.id, classItem);
    });
    this.currentClassId = 4;

    // Sample videos
    const videoData = [
      { id: 1, title: "Spanish Grammar Basics", description: "Master the fundamentals of Spanish grammar", instructor: "Prof. Ana García", level: "Beginner", duration: "24:15", thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop", videoUrl: "https://example.com/video1.mp4", category: "Grammar", isActive: true, createdAt: new Date() },
      { id: 2, title: "Conversation Techniques", description: "Improve your speaking confidence", instructor: "Prof. Carlos Mendez", level: "Intermediate", duration: "18:42", thumbnailUrl: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=400&fit=crop", videoUrl: "https://example.com/video2.mp4", category: "Speaking", isActive: true, createdAt: new Date() },
      { id: 3, title: "Business Spanish", description: "Professional Spanish for the workplace", instructor: "Prof. Isabella Torres", level: "Advanced", duration: "32:08", thumbnailUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&h=400&fit=crop", videoUrl: "https://example.com/video3.mp4", category: "Business", isActive: true, createdAt: new Date() },
      { id: 4, title: "Pronunciation Mastery", description: "Perfect your Spanish accent", instructor: "Prof. Miguel Ruiz", level: "All Levels", duration: "15:30", thumbnailUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&h=400&fit=crop", videoUrl: "https://example.com/video4.mp4", category: "Pronunciation", isActive: true, createdAt: new Date() },
      { id: 5, title: "Cultural Insights", description: "Understanding Hispanic cultures", instructor: "Prof. Sofia Vargas", level: "Intermediate", duration: "21:45", thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", videoUrl: "https://example.com/video5.mp4", category: "Culture", isActive: true, createdAt: new Date() },
      { id: 6, title: "Advanced Writing", description: "Master complex writing structures", instructor: "Prof. Eduardo Morales", level: "Advanced", duration: "28:12", thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop", videoUrl: "https://example.com/video6.mp4", category: "Writing", isActive: true, createdAt: new Date() }
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

  private async ensureInitialized() {
    await this.initialized;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByHighLevelContactId(contactId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(user => user.highLevelContactId === contactId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = this.currentUserId++;
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      createdAt: new Date(),
      level: insertUser.level || "A1",
      avatar: insertUser.avatar || null,
      phone: insertUser.phone || null,
      userType: insertUser.userType || "student",
      trialCompleted: insertUser.trialCompleted || false,
      classCredits: insertUser.classCredits || 0,
      highLevelContactId: insertUser.highLevelContactId || null,
      trialTutorId: insertUser.trialTutorId || null,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      aiSubscriptionActive: insertUser.aiSubscriptionActive || false,
      aiMessagesUsed: insertUser.aiMessagesUsed || 0,
      aiMessagesResetAt: insertUser.aiMessagesResetAt || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = this.users.get(id);
    if (!user) return undefined;

    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    await this.ensureInitialized();
    const user = await this.getUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    await this.ensureInitialized();
    return Array.from(this.subscriptions.values()).find(sub => sub.userId === userId);
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    await this.ensureInitialized();
    return Array.from(this.subscriptions.values()).find(sub => sub.stripeSubscriptionId === stripeSubscriptionId);
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;

    const updatedSubscription = { ...subscription, ...subscriptionData };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async getAllTutors(): Promise<Tutor[]> {
    await this.ensureInitialized();
    return Array.from(this.tutors.values()).filter(tutor => tutor.isActive);
  }

  async getTutor(id: number): Promise<Tutor | undefined> {
    await this.ensureInitialized();
    return this.tutors.get(id);
  }

  async createTutor(tutorData: InsertTutor): Promise<Tutor> {
    await this.ensureInitialized();
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
      classType: tutorData.classType || "adults",
      languageTaught: tutorData.languageTaught || "spanish",
      phone: tutorData.phone || null,
      highLevelContactId: tutorData.highLevelContactId || null,
      highLevelCalendarId: tutorData.highLevelCalendarId || null,
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
    await this.ensureInitialized();
    return Array.from(this.classes.values());
  }

  async getUserClasses(userId: number): Promise<Class[]> {
    await this.ensureInitialized();
    return Array.from(this.classes.values())
      .filter(classItem => classItem.userId === userId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async getUpcomingClasses(userId: number): Promise<Class[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const id = this.currentClassId++;
    const classItem: Class = {
      ...classData,
      id,
      createdAt: new Date(),
      description: classData.description || null,
      duration: classData.duration || 60,
      status: classData.status || "scheduled",
      isTrial: classData.isTrial || false,
      classCategory: classData.classCategory || null,
      meetingLink: classData.meetingLink || null,
      highLevelContactId: classData.highLevelContactId || null,
      highLevelAppointmentId: classData.highLevelAppointmentId || null
    };
    this.classes.set(id, classItem);
    return classItem;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    await this.ensureInitialized();
    const classItem = this.classes.get(id);
    if (!classItem) return undefined;

    const updatedClass = { ...classItem, ...classData };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async cancelClass(id: number, userId: number): Promise<boolean> {
    await this.ensureInitialized();
    const classItem = this.classes.get(id);
    if (!classItem || classItem.userId !== userId) return false;

    const updatedClass = { ...classItem, status: "cancelled" as const };
    this.classes.set(id, updatedClass);
    return true;
  }

  async getAllVideos(): Promise<Video[]> {
    await this.ensureInitialized();
    return Array.from(this.videos.values()).filter(video => video.isActive);
  }

  async getVideosByLevel(level: string): Promise<Video[]> {
    await this.ensureInitialized();
    return Array.from(this.videos.values())
      .filter(video => video.isActive && (video.level === level || video.level === "All Levels"));
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    return Array.from(this.userProgress.values()).find(progress => progress.userId === userId);
  }

  async updateUserProgress(userId: number, progressData: Partial<InsertUserProgress>): Promise<UserProgress> {
    await this.ensureInitialized();
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

  async getTutorsByCategory(classType?: string, languageTaught?: string): Promise<Tutor[]> {
    await this.ensureInitialized();
    let result = Array.from(this.tutors.values()).filter(t => t.isActive);
    if (classType) result = result.filter(t => t.classType === classType);
    if (languageTaught) result = result.filter(t => t.languageTaught === languageTaught);
    return result;
  }

  async updateTutor(id: number, data: Partial<InsertTutor>): Promise<Tutor | undefined> {
    await this.ensureInitialized();
    const tutor = this.tutors.get(id);
    if (!tutor) return undefined;
    const updated = { ...tutor, ...data };
    this.tutors.set(id, updated);
    return updated;
  }

  async getReviewsByTutor(tutorId: number): Promise<Review[]> {
    await this.ensureInitialized();
    return Array.from(this.reviewsMap.values())
      .filter(r => r.tutorId === tutorId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createReview(review: InsertReview): Promise<Review> {
    await this.ensureInitialized();
    const id = this.currentReviewId++;
    const newReview: Review = {
      ...review,
      id,
      comment: review.comment || null,
      classId: review.classId || null,
      createdAt: new Date(),
    };
    this.reviewsMap.set(id, newReview);
    return newReview;
  }

  async getUserReviewForTutor(userId: number, tutorId: number): Promise<Review | undefined> {
    await this.ensureInitialized();
    return Array.from(this.reviewsMap.values())
      .find(r => r.userId === userId && r.tutorId === tutorId);
  }

  async hasUsedTrial(userId: number): Promise<boolean> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    return user?.trialCompleted === true;
  }

  async createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission> {
    await this.ensureInitialized();
    const id = this.currentContactSubmissionId++;
    const submission: ContactSubmission = {
      ...data,
      id,
      phone: data.phone || null,
      level: data.level || null,
      preferredContact: data.preferredContact || null,
      status: data.status || "new",
      createdAt: new Date(),
    };
    this.contactSubmissions.set(id, submission);
    return submission;
  }

  // AI Practice Partner
  async createAiConversation(data: InsertAiConversation): Promise<AiConversation> {
    await this.ensureInitialized();
    const id = this.currentAiConversationId++;
    const conv: AiConversation = {
      id,
      userId: data.userId,
      title: data.title || "New Conversation",
      language: data.language || "spanish",
      mode: data.mode || "chat",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.aiConversationsMap.set(id, conv);
    return conv;
  }

  async getAiConversations(userId: number): Promise<AiConversation[]> {
    await this.ensureInitialized();
    return Array.from(this.aiConversationsMap.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    await this.ensureInitialized();
    return this.aiConversationsMap.get(id);
  }

  async getAiMessages(conversationId: number): Promise<AiMessage[]> {
    await this.ensureInitialized();
    return Array.from(this.aiMessagesMap.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async addAiMessage(data: InsertAiMessage): Promise<AiMessage> {
    await this.ensureInitialized();
    const id = this.currentAiMessageId++;
    const message: AiMessage = {
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      corrections: data.corrections || null,
      createdAt: new Date(),
    };
    this.aiMessagesMap.set(id, message);
    // Update conversation updatedAt
    const conv = this.aiConversationsMap.get(data.conversationId);
    if (conv) {
      conv.updatedAt = new Date();
    }
    return message;
  }

  async updateAiConversationTitle(id: number, title: string): Promise<void> {
    await this.ensureInitialized();
    const conv = this.aiConversationsMap.get(id);
    if (conv) conv.title = title;
  }

  async getUserAiUsage(userId: number): Promise<number> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    return user?.aiMessagesUsed || 0;
  }

  async incrementAiUsage(userId: number): Promise<void> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (user) {
      user.aiMessagesUsed = (user.aiMessagesUsed || 0) + 1;
    }
  }

  async resetAiUsage(userId: number): Promise<void> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (user) {
      user.aiMessagesUsed = 0;
      user.aiMessagesResetAt = new Date();
    }
  }

  async getAiAdminStats() {
    await this.ensureInitialized();
    const allConversations = Array.from(this.aiConversationsMap.values());
    const allMessages = Array.from(this.aiMessagesMap.values());
    const userIds = Array.from(new Set(allConversations.map(c => c.userId)));

    const userStats = userIds.map(userId => {
      const user = this.users.get(userId);
      const convs = allConversations.filter(c => c.userId === userId);
      const convIds = new Set(convs.map(c => c.id));
      const msgs = allMessages.filter(m => convIds.has(m.conversationId));
      const lastConv = convs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0];
      return {
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        conversationCount: convs.length,
        messageCount: msgs.length,
        lastActive: lastConv?.updatedAt || null,
      };
    });

    return {
      totalConversations: allConversations.length,
      totalMessages: allMessages.length,
      activeUsers: userIds.length,
      userStats,
    };
  }
}

// Use DatabaseStorage when DATABASE_URL is available, MemStorage otherwise
import { createRequire } from "module";
const require = createRequire(import.meta.url);

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    const { DatabaseStorage } = require("./storage-database");
    return new DatabaseStorage();
  }
  return new MemStorage();
}

export const storage = createStorage();
