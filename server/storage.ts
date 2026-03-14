import bcrypt from "bcryptjs";
import {
  users, tutors, classes, videos, subscriptions, userProgress,
  type User, type InsertUser, type Tutor, type InsertTutor,
  type Class, type InsertClass, type Video, type InsertVideo,
  type Subscription, type InsertSubscription, type UserProgress, type InsertUserProgress,
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
  type EmailCampaignEvent, type InsertEmailCampaignEvent,
  type CrmNote, type InsertCrmNote,
  type CrmTask, type InsertCrmTask,
  type CrmTag, type InsertCrmTag,
  type EmailTemplate, type InsertEmailTemplate,
  type AudienceSegment, type InsertAudienceSegment,
  type Campaign, type InsertCampaign,
  type CampaignRecipient, type InsertCampaignRecipient,
  type Offer, type InsertOffer,
  type CommunicationLogEntry, type InsertCommunicationLog,
  type AiStudentProfile, type InsertAiStudentProfile,
  type AiSavedCorrection, type InsertAiSavedCorrection,
  type StripeEvent, type InsertStripeEvent,
  type LearningPathStation, type InsertLearningPathStation,
  type LearningPathContent, type InsertLearningPathContent,
  type StudentPathProgress, type InsertStudentPathProgress,
  type StudentQuizAttempt, type InsertStudentQuizAttempt,
  type TutorAssignment, type InsertTutorAssignment,
  type LevelProgressionRule, type InsertLevelProgressionRule,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type TutorGoogleToken, type InsertTutorGoogleToken,
} from "@shared/schema";

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Auth
  authenticateUser(email: string, password: string): Promise<User | null>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  linkOAuthId(userId: number, provider: 'google' | 'microsoft', providerId: string): Promise<void>;

  // Subscriptions
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Tutors
  getAllTutors(): Promise<Tutor[]>;
  getTutor(id: number): Promise<Tutor | undefined>;
  getTutorByUserId(userId: number): Promise<Tutor | undefined>;
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
  getClassById(id: number): Promise<Class | undefined>;
  getScheduledClasses(): Promise<Class[]>;
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

  // AI Student Profile & Progress
  getAiStudentProfile(userId: number): Promise<any>;
  upsertAiStudentProfile(userId: number, data: any): Promise<any>;
  getAiProgressStats(userId: number): Promise<any>;

  // AI Saved Corrections
  saveAiCorrection(data: any): Promise<any>;
  getAiSavedCorrections(userId: number): Promise<any[]>;
  deleteAiCorrection(id: number, userId: number): Promise<void>;

  // AI Vocabulary
  saveAiVocabulary(data: { userId: number; messageId?: number | null; word: string; translation: string; context?: string | null; language: string }): Promise<any>;
  getAiVocabulary(userId: number): Promise<any[]>;
  deleteAiVocabulary(id: number, userId: number): Promise<void>;
  updateAiVocabularyMastery(id: number, userId: number, mastery: number): Promise<any>;

  // Tutor Availability
  getTutorAvailability(tutorId: number): Promise<TutorAvailability[]>;
  setTutorAvailability(tutorId: number, slots: InsertTutorAvailability[]): Promise<TutorAvailability[]>;
  deleteTutorAvailability(tutorId: number): Promise<void>;

  // Availability Exceptions
  getTutorExceptions(tutorId: number, startDate: Date, endDate: Date): Promise<TutorAvailabilityException[]>;
  createTutorException(exception: InsertTutorAvailabilityException): Promise<TutorAvailabilityException>;
  deleteTutorException(id: number, tutorId?: number): Promise<boolean>;

  // Conflict Detection
  getTutorClassesForDate(tutorId: number, date: Date): Promise<Class[]>;
  checkConflict(tutorId: number, scheduledAt: Date, duration: number): Promise<boolean>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId?: number): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Achievements
  getAchievements(userId: number): Promise<Achievement[]>;
  createAchievement(data: InsertAchievement): Promise<Achievement>;
  hasAchievement(userId: number, type: string): Promise<boolean>;

  // Support Tickets
  createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(userId?: number): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  updateSupportTicket(id: number, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  getSupportMessages(ticketId: number): Promise<SupportMessage[]>;
  createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage>;

  // Direct Messaging
  getConversations(userId: number): Promise<Conversation[]>;
  getOrCreateConversation(userA: number, userB: number): Promise<Conversation>;
  getMessages(conversationId: number, limit?: number, offset?: number): Promise<DirectMessage[]>;
  createMessage(data: InsertDirectMessage): Promise<DirectMessage>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Notification Preferences
  getNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined>;
  upsertNotificationPreferences(userId: number, prefs: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences>;

  // Payment History
  getPaymentHistory(userId: number): Promise<ClassPurchase[]>;

  // Atomic credit operations
  deductClassCredit(userId: number): Promise<User | undefined>;
  refundClassCredit(userId: number): Promise<User | undefined>;

  // Atomic class completion (prevents double-complete)
  completeClassIfScheduled(classId: number): Promise<Class | undefined>;

  // Tutor-specific class query (performance)
  getClassesByTutor(tutorId: number): Promise<Class[]>;

  // Email Campaign Events
  getEmailCampaignEvents(userId: number): Promise<EmailCampaignEvent[]>;
  createEmailCampaignEvent(userId: number, step: string): Promise<EmailCampaignEvent>;

  // CRM
  getStudentsCRM(params: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ students: User[]; total: number }>;

  // CRM Notes
  getCrmNotes(userId: number): Promise<CrmNote[]>;
  createCrmNote(data: InsertCrmNote): Promise<CrmNote>;
  deleteCrmNote(id: number): Promise<boolean>;

  // CRM Tasks
  getCrmTasks(params: { userId?: number; assignedTo?: number; status?: string }): Promise<CrmTask[]>;
  createCrmTask(data: InsertCrmTask): Promise<CrmTask>;
  updateCrmTask(id: number, data: Partial<InsertCrmTask & { status: string; completedAt: Date | null }>): Promise<CrmTask | undefined>;
  deleteCrmTask(id: number): Promise<boolean>;

  // CRM Tags
  getAllCrmTags(): Promise<CrmTag[]>;
  createCrmTag(data: InsertCrmTag): Promise<CrmTag>;
  deleteCrmTag(id: number): Promise<boolean>;
  getUserCrmTags(userId: number): Promise<CrmTag[]>;
  addUserCrmTag(userId: number, tagId: number): Promise<void>;
  removeUserCrmTag(userId: number, tagId: number): Promise<void>;

  // CRM Metrics
  getCrmFunnel(): Promise<{ stage: string; count: number }[]>;

  // Delete User
  deleteUser(id: number): Promise<boolean>;

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

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;

  // Audience Segments
  getAudienceSegments(): Promise<AudienceSegment[]>;
  getAudienceSegment(id: number): Promise<AudienceSegment | undefined>;
  createAudienceSegment(data: InsertAudienceSegment): Promise<AudienceSegment>;
  updateAudienceSegment(id: number, data: Partial<InsertAudienceSegment>): Promise<AudienceSegment | undefined>;
  deleteAudienceSegment(id: number): Promise<boolean>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<InsertCampaign & { status: string; sentAt: Date }>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Campaign Recipients
  getCampaignRecipients(campaignId: number): Promise<CampaignRecipient[]>;
  createCampaignRecipient(data: InsertCampaignRecipient): Promise<CampaignRecipient>;

  // Offers
  getOffers(): Promise<Offer[]>;
  getOffer(id: number): Promise<Offer | undefined>;
  getOfferByCode(code: string): Promise<Offer | undefined>;
  getOfferByStripePromotionCodeId(promoCodeId: string): Promise<Offer | undefined>;
  createOffer(data: InsertOffer): Promise<Offer>;
  updateOffer(id: number, data: Partial<Offer>): Promise<Offer | undefined>;
  deleteOffer(id: number): Promise<boolean>;
  incrementOfferUsage(id: number): Promise<void>;

  // Communication Log
  getCommunicationLog(userId: number): Promise<CommunicationLogEntry[]>;
  createCommunicationLog(data: InsertCommunicationLog): Promise<CommunicationLogEntry>;

  // Campaign recipient tracking
  getRecipientByResendId(resendMessageId: string): Promise<CampaignRecipient | undefined>;
  updateCampaignRecipient(id: number, data: Partial<CampaignRecipient>): Promise<void>;
  incrementCampaignOpened(campaignId: number): Promise<void>;
  incrementCampaignClicked(campaignId: number): Promise<void>;

  // Newsletter Subscribers
  getNewsletterSubscribers(filters?: { status?: string; source?: string; search?: string }): Promise<{ subscribers: NewsletterSubscriber[]; total: number; metrics: any }>;
  createNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  upsertNewsletterSubscriber(data: InsertNewsletterSubscriber & { userId?: number }): Promise<NewsletterSubscriber>;
  unsubscribeNewsletter(email: string): Promise<void>;
  deleteNewsletterSubscriber(id: number): Promise<boolean>;

  // Stripe Events
  createStripeEvent(data: InsertStripeEvent): Promise<StripeEvent>;
  getStripeEvents(eventType?: string, from?: Date, to?: Date): Promise<StripeEvent[]>;

  // Class Purchases (extended)
  getClassPurchaseByPaymentIntent(paymentIntentId: string): Promise<ClassPurchase | undefined>;
  updateClassPurchase(id: number, data: Partial<ClassPurchase>): Promise<ClassPurchase | undefined>;

  // Learning Path - Stations
  getStationsByLevel(level: string): Promise<LearningPathStation[]>;
  getStation(id: number): Promise<LearningPathStation | undefined>;
  getAllStations(): Promise<LearningPathStation[]>;
  createStation(data: InsertLearningPathStation): Promise<LearningPathStation>;
  deleteStation(id: number): Promise<void>;

  // Learning Path - Content
  getContentByStation(stationId: number): Promise<LearningPathContent[]>;
  getContent(id: number): Promise<LearningPathContent | undefined>;
  createContent(data: InsertLearningPathContent): Promise<LearningPathContent>;
  updateContent(id: number, data: Partial<InsertLearningPathContent>): Promise<LearningPathContent>;
  deleteContent(id: number): Promise<void>;

  // Learning Path - Student Progress
  getStudentProgress(userId: number): Promise<StudentPathProgress[]>;
  getStudentStationProgress(userId: number, stationId: number): Promise<StudentPathProgress | undefined>;
  upsertStudentProgress(data: InsertStudentPathProgress): Promise<StudentPathProgress>;

  // Learning Path - Quiz Attempts
  createQuizAttempt(data: InsertStudentQuizAttempt): Promise<StudentQuizAttempt>;
  getQuizAttempts(userId: number, contentId: number): Promise<StudentQuizAttempt[]>;
  getQuizAttemptsByUser(userId: number): Promise<StudentQuizAttempt[]>;

  // Learning Path - Tutor Assignments
  createAssignment(data: InsertTutorAssignment): Promise<TutorAssignment>;
  getAssignmentsForStudent(studentId: number): Promise<TutorAssignment[]>;
  getAssignmentsByTutor(tutorId: number): Promise<TutorAssignment[]>;
  updateAssignment(id: number, data: Partial<InsertTutorAssignment>): Promise<TutorAssignment>;

  // Learning Path - Level Progression Rules
  getLevelRules(fromLevel: string): Promise<LevelProgressionRule | undefined>;
  getAllLevelRules(): Promise<LevelProgressionRule[]>;
  upsertLevelRule(data: InsertLevelProgressionRule): Promise<LevelProgressionRule>;

  // Google OAuth Tokens
  getTutorGoogleToken(tutorId: number): Promise<TutorGoogleToken | undefined>;
  upsertTutorGoogleToken(data: InsertTutorGoogleToken): Promise<TutorGoogleToken>;
  deleteTutorGoogleToken(tutorId: number): Promise<boolean>;
  updateTutorGoogleToken(tutorId: number, data: Partial<InsertTutorGoogleToken>): Promise<TutorGoogleToken | undefined>;
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
  private tutorAvailabilityMap: Map<number, TutorAvailability>;
  private currentTutorAvailabilityId: number;
  private tutorAvailabilityExceptionsMap: Map<number, TutorAvailabilityException>;
  private currentTutorAvailabilityExceptionId: number;
  private notificationsMap: Map<number, Notification>;
  private currentNotificationId: number;
  private achievementsMap: Map<number, Achievement>;
  private currentAchievementId: number;
  private supportTicketsMap: Map<number, SupportTicket>;
  private currentSupportTicketId: number;
  private supportMessagesMap: Map<number, SupportMessage>;
  private currentSupportMessageId: number;
  private conversationsMap: Map<number, Conversation>;
  private currentConversationId: number;
  private directMessagesMap: Map<number, DirectMessage>;
  private currentDirectMessageId: number;
  private notifPrefsMap: Map<number, UserNotificationPreferences>;
  private currentNotifPrefsId: number;
  private classPurchasesMap: Map<number, ClassPurchase>;
  private campaignEventsMap: Map<number, EmailCampaignEvent>;
  private currentCampaignEventId: number;
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
    this.tutorAvailabilityMap = new Map();
    this.currentTutorAvailabilityId = 1;
    this.tutorAvailabilityExceptionsMap = new Map();
    this.currentTutorAvailabilityExceptionId = 1;
    this.notificationsMap = new Map();
    this.currentNotificationId = 1;
    this.achievementsMap = new Map();
    this.currentAchievementId = 1;
    this.supportTicketsMap = new Map();
    this.currentSupportTicketId = 1;
    this.supportMessagesMap = new Map();
    this.currentSupportMessageId = 1;
    this.conversationsMap = new Map();
    this.currentConversationId = 1;
    this.directMessagesMap = new Map();
    this.currentDirectMessageId = 1;
    this.notifPrefsMap = new Map();
    this.currentNotifPrefsId = 1;
    this.classPurchasesMap = new Map();
    this.campaignEventsMap = new Map();
    this.currentCampaignEventId = 1;

    this.initialized = this.initializeData();
  }

  private async initializeData() {
    const hashedPassword = await bcrypt.hash("password123", 12);
    const adminPassword = await bcrypt.hash("admin123", 12);

    // Admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin_p2f",
      email: "admin@p2f.com",
      password: adminPassword,
      googleId: null,
      microsoftId: null,
      firstName: "Admin",
      lastName: "P2F",
      phone: null,
      level: "A1",
      avatar: null,
      userType: "admin",
      trialCompleted: false,
      classCredits: 0,
      trialTutorId: null,
      stripeCustomerId: null,
      aiSubscriptionActive: false,
      aiMessagesUsed: 0,
      aiMessagesResetAt: null,
      timezone: null,
      currency: "USD",
      profileImage: null,
      autoconfirmMode: "all",
      calendarConnected: false,
      lastActivityAt: null,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Test user
    const user: User = {
      id: this.currentUserId++,
      username: "juan_sanchez",
      email: "juan.sanchez@example.com",
      password: hashedPassword,
      googleId: null,
      microsoftId: null,
      firstName: "Juan",
      lastName: "Sánchez",
      phone: "+1-555-0123",
      level: "B1",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 8,
      trialTutorId: null,
      stripeCustomerId: null,
      aiSubscriptionActive: false,
      aiMessagesUsed: 0,
      aiMessagesResetAt: null,
      timezone: "America/New_York",
      currency: "USD",
      profileImage: null,
      autoconfirmMode: "all",
      calendarConnected: false,
      lastActivityAt: new Date(),
      createdAt: new Date(),
    };
    this.users.set(1, user);

    const user2: User = {
      id: 2,
      username: "maria_rodriguez",
      email: "maria.rodriguez@example.com",
      password: hashedPassword,
      googleId: null,
      microsoftId: null,
      firstName: "María",
      lastName: "Rodríguez",
      phone: "+1-555-0124",
      level: "A2",
      avatar: null,
      userType: "customer",
      trialCompleted: true,
      classCredits: 12,
      trialTutorId: null,
      stripeCustomerId: null,
      aiSubscriptionActive: false,
      aiMessagesUsed: 0,
      aiMessagesResetAt: null,
      timezone: "America/New_York",
      currency: "USD",
      profileImage: null,
      autoconfirmMode: "all",
      calendarConnected: false,
      lastActivityAt: new Date(),
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
      cancelledAt: null,
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

        createdAt: new Date(),
        isActive: true,
        specialization: "Lead Instructor • Bilingual Education",
        specializationEs: "Instructora Principal • Educación Bilingüe",
        bio: "International Relations graduate with a Master's in English Teaching Methodology and 15+ years of experience. Currently pursuing a Doctorate in Educational Sciences. Specializes in bilingual education and cross-cultural communication. Trilingual (Spanish/English C1/French B2).",
        bioEs: "Graduada en Relaciones Internacionales con Maestría en Metodología de Enseñanza de Inglés y más de 15 años de experiencia. Especialista en educación bilingüe y comunicación intercultural.",
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
        userId: null,
      },
      {
        id: 2,
        name: "Evelyn Salcedo",
        email: "evelyn@passport2fluency.com",
        phone: null,
        avatar: "/attached_assets/teachers/evelyn-salcedo.jpg",

        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish Language Specialist • Cultural Connection",
        specializationEs: "Especialista en Español • Conexión Cultural",
        bio: "Passionate about languages and connecting people across cultures. 5+ years of experience teaching Spanish and English to children, youth, and adults. Helps students discover and enjoy Spanish through natural, practical, and fluent learning methods.",
        bioEs: "Apasionada por los idiomas y por conectar personas entre culturas. Más de 5 años de experiencia enseñando español e inglés.",
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
        userId: null,
      },
      {
        id: 3,
        name: "Diego Felipe Rodríguez Martínez",
        email: "coach@passport2fluency.com",
        phone: "(210) 201-4490",
        avatar: "/attached_assets/teachers/diego-felipe-rodriguez.jpg",

        createdAt: new Date(),
        isActive: true,
        specialization: "Spanish Instructor & Education Specialist",
        specializationEs: "Instructor de Español y Especialista en Educación",
        bio: "Physical Education professor with a Master's in Physical Culture Pedagogy and currently pursuing a PhD in Education. Expert in creating engaging, active learning environments for Spanish instruction with innovative methodologies.",
        bioEs: "Profesor de Educación Física con Maestría en Pedagogía de Cultura Física. Experto en crear ambientes de aprendizaje dinámicos y participativos.",
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
        userId: null,
      },
      {
        id: 4,
        name: "Gloria Cardona",
        email: "gloria@passport2fluency.com",
        phone: "(312) 312-1826",
        avatar: "/attached_assets/teachers/gloria-cardona.jpg",

        createdAt: new Date(),
        isActive: true,
        specialization: "Children's Specialist • Kids Spanish Expert",
        specializationEs: "Especialista en Niños • Experta en Español Infantil",
        bio: "Elementary education specialist with 8+ years making Spanish fun for kids. Expert in interactive games and storytelling methods that engage children and make language learning an exciting adventure.",
        bioEs: "Especialista en educación primaria con más de 8 años haciendo que el español sea divertido para los niños.",
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
        userId: null,
      },
      {
        id: 5,
        name: "Johanna Pacheco",
        email: "johanna@passport2fluency.com",
        phone: null,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",

        createdAt: new Date(),
        isActive: true,
        specialization: "Cultural Immersion Expert • Anthropology",
        specializationEs: "Experta en Inmersión Cultural • Antropología",
        bio: "Anthropology graduate from Universidad Nacional specializing in Colombian and Latin American culture. Helps students understand regional dialects, customs, and cultural nuances for authentic Spanish immersion.",
        bioEs: "Graduada en Antropología especializada en cultura colombiana y latinoamericana. Ayuda a los estudiantes a comprender dialectos regionales y matices culturales.",
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
        userId: null,
      }
    ];

    tutorData.forEach(tutor => {
      this.tutors.set(tutor.id, tutor);
    });
    this.currentTutorId = 6;

    // Test classes
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
        meetingLink: "https://meet.jit.si/P2F-Carolina-Perilla-class1",
        calendarEventId: null,
        tutorCalendarEventId: null,
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
        meetingLink: "https://meet.jit.si/P2F-Evelyn-Salcedo-class2",
        calendarEventId: null,
        tutorCalendarEventId: null,
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
        meetingLink: "https://meet.jit.si/P2F-Diego-Rodriguez-class3",
        calendarEventId: null,
        tutorCalendarEventId: null,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = this.currentUserId++;
    const hashedPassword = insertUser.password
      ? await bcrypt.hash(insertUser.password, 12)
      : null;
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      googleId: null,
      microsoftId: null,
      createdAt: new Date(),
      level: insertUser.level || "A1",
      avatar: insertUser.avatar || null,
      phone: insertUser.phone || null,
      userType: insertUser.userType || "student",
      trialCompleted: insertUser.trialCompleted || false,
      classCredits: insertUser.classCredits || 0,
      trialTutorId: insertUser.trialTutorId || null,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      aiSubscriptionActive: insertUser.aiSubscriptionActive || false,
      aiMessagesUsed: insertUser.aiMessagesUsed || 0,
      aiMessagesResetAt: insertUser.aiMessagesResetAt || null,
      timezone: insertUser.timezone || "America/New_York",
      currency: insertUser.currency || "USD",
      profileImage: insertUser.profileImage || null,
      autoconfirmMode: insertUser.autoconfirmMode || "all",
      calendarConnected: insertUser.calendarConnected || false,
      lastActivityAt: new Date(),
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
    if (user && user.password && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(u => u.googleId === googleId);
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(u => u.microsoftId === microsoftId);
  }

  async linkOAuthId(userId: number, provider: 'google' | 'microsoft', providerId: string): Promise<void> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (user) {
      if (provider === 'google') user.googleId = providerId;
      else user.microsoftId = providerId;
    }
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
      nextBillingDate: subscriptionData.nextBillingDate || null,
      cancelledAt: subscriptionData.cancelledAt || null,
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

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    await this.ensureInitialized();
    return Array.from(this.tutors.values()).find(t => t.userId === userId);
  }

  async createTutor(tutorData: InsertTutor): Promise<Tutor> {
    await this.ensureInitialized();
    const id = this.currentTutorId++;
    const tutor: Tutor = {
      ...tutorData,
      id,
      createdAt: new Date(),
      bio: tutorData.bio || null,
      bioEs: tutorData.bioEs || null,
      specializationEs: tutorData.specializationEs || null,
      avatar: tutorData.avatar || null,
      rating: tutorData.rating || "5.00",
      reviewCount: tutorData.reviewCount || 0,
      isActive: tutorData.isActive !== undefined ? tutorData.isActive : true,
      classType: tutorData.classType || "adults",
      languageTaught: tutorData.languageTaught || "spanish",
      phone: tutorData.phone || null,
      userId: tutorData.userId || null,
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

  async getClassById(id: number): Promise<Class | undefined> {
    await this.ensureInitialized();
    return this.classes.get(id);
  }

  async getScheduledClasses(): Promise<Class[]> {
    await this.ensureInitialized();
    return Array.from(this.classes.values()).filter(c => c.status === "scheduled");
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
      calendarEventId: classData.calendarEventId || null,
      tutorCalendarEventId: classData.tutorCalendarEventId || null,
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
      scenario: data.scenario || null,
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

  // AI Student Profile & Progress (in-memory stubs)
  private aiStudentProfilesMap = new Map<number, any>();
  private aiSavedCorrectionsMap = new Map<number, any>();
  private currentAiCorrectionId = 1;
  private aiVocabularyMap = new Map<number, any>();
  private currentAiVocabularyId = 1;

  async getAiStudentProfile(userId: number): Promise<any> {
    return this.aiStudentProfilesMap.get(userId) || null;
  }

  async upsertAiStudentProfile(userId: number, data: any): Promise<any> {
    const existing = this.aiStudentProfilesMap.get(userId) || { userId };
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.aiStudentProfilesMap.set(userId, updated);
    return updated;
  }

  async getAiProgressStats(userId: number): Promise<any> {
    await this.ensureInitialized();
    const allConvos = Array.from(this.aiConversationsMap.values());
    const convos = allConvos.filter((c: AiConversation) => c.userId === userId);
    const convoIds = new Set(convos.map((c: AiConversation) => c.id));
    const allMsgs = Array.from(this.aiMessagesMap.values());
    const userMsgs = allMsgs.filter(
      (m: AiMessage) => convoIds.has(m.conversationId) && m.role === "user"
    );
    const correctionMsgs = allMsgs.filter(
      (m: AiMessage) => convoIds.has(m.conversationId) && m.corrections
    );
    const allCorrections = correctionMsgs.flatMap((m: any) => m.corrections || []);

    const errorMap = new Map<string, number>();
    for (const c of allCorrections) {
      const key = `${c.original} → ${c.corrected}`;
      errorMap.set(key, (errorMap.get(key) || 0) + 1);
    }
    const topErrors = Array.from(errorMap.entries())
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]: [string, number]) => ({ error, count }));

    return {
      totalConversations: convos.length,
      totalMessages: userMsgs.length,
      totalCorrections: allCorrections.length,
      topErrors,
      languageBreakdown: {
        spanish: convos.filter((c: AiConversation) => c.language === "spanish").length,
        english: convos.filter((c: AiConversation) => c.language === "english").length,
      },
      modeBreakdown: {
        chat: convos.filter((c: AiConversation) => c.mode === "chat").length,
        voice: convos.filter((c: AiConversation) => c.mode === "voice").length,
        grammar: convos.filter((c: AiConversation) => c.mode === "grammar").length,
      },
    };
  }

  async saveAiCorrection(data: any): Promise<any> {
    const id = this.currentAiCorrectionId++;
    const correction = { id, ...data, createdAt: new Date() };
    this.aiSavedCorrectionsMap.set(id, correction);
    return correction;
  }

  async getAiSavedCorrections(userId: number): Promise<any[]> {
    return Array.from(this.aiSavedCorrectionsMap.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteAiCorrection(id: number, userId: number): Promise<void> {
    const correction = this.aiSavedCorrectionsMap.get(id);
    if (correction && correction.userId === userId) {
      this.aiSavedCorrectionsMap.delete(id);
    }
  }

  // AI Vocabulary
  async saveAiVocabulary(data: { userId: number; messageId?: number | null; word: string; translation: string; context?: string | null; language: string }): Promise<any> {
    const id = this.currentAiVocabularyId++;
    const vocab = { id, ...data, mastery: 0, lastReviewedAt: null, createdAt: new Date() };
    this.aiVocabularyMap.set(id, vocab);
    return vocab;
  }

  async getAiVocabulary(userId: number): Promise<any[]> {
    return Array.from(this.aiVocabularyMap.values())
      .filter(v => v.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteAiVocabulary(id: number, userId: number): Promise<void> {
    const vocab = this.aiVocabularyMap.get(id);
    if (vocab && vocab.userId === userId) {
      this.aiVocabularyMap.delete(id);
    }
  }

  async updateAiVocabularyMastery(id: number, userId: number, mastery: number): Promise<any> {
    const vocab = this.aiVocabularyMap.get(id);
    if (vocab && vocab.userId === userId) {
      vocab.mastery = mastery;
      vocab.lastReviewedAt = new Date();
      this.aiVocabularyMap.set(id, vocab);
      return vocab;
    }
    return null;
  }

  // Tutor Availability
  async getTutorAvailability(tutorId: number): Promise<TutorAvailability[]> {
    await this.ensureInitialized();
    return Array.from(this.tutorAvailabilityMap.values())
      .filter(a => a.tutorId === tutorId && a.isAvailable);
  }

  async setTutorAvailability(tutorId: number, slots: InsertTutorAvailability[]): Promise<TutorAvailability[]> {
    await this.ensureInitialized();
    // Delete existing availability for this tutor
    Array.from(this.tutorAvailabilityMap.entries()).forEach(([id, a]) => {
      if (a.tutorId === tutorId) this.tutorAvailabilityMap.delete(id);
    });
    // Insert new slots
    const result: TutorAvailability[] = [];
    for (const slot of slots) {
      const id = this.currentTutorAvailabilityId++;
      const availability: TutorAvailability = {
        id,
        tutorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true,
        createdAt: new Date(),
      };
      this.tutorAvailabilityMap.set(id, availability);
      result.push(availability);
    }
    return result;
  }

  async deleteTutorAvailability(tutorId: number): Promise<void> {
    await this.ensureInitialized();
    Array.from(this.tutorAvailabilityMap.entries()).forEach(([id, a]) => {
      if (a.tutorId === tutorId) this.tutorAvailabilityMap.delete(id);
    });
  }

  // Availability Exceptions
  async getTutorExceptions(tutorId: number, startDate: Date, endDate: Date): Promise<TutorAvailabilityException[]> {
    await this.ensureInitialized();
    return Array.from(this.tutorAvailabilityExceptionsMap.values())
      .filter(e => e.tutorId === tutorId && e.date >= startDate && e.date <= endDate);
  }

  async createTutorException(exception: InsertTutorAvailabilityException): Promise<TutorAvailabilityException> {
    await this.ensureInitialized();
    const id = this.currentTutorAvailabilityExceptionId++;
    const exc: TutorAvailabilityException = {
      id,
      tutorId: exception.tutorId,
      date: exception.date,
      isBlocked: exception.isBlocked !== undefined ? exception.isBlocked : true,
      startTime: exception.startTime || null,
      endTime: exception.endTime || null,
      reason: exception.reason || null,
      createdAt: new Date(),
    };
    this.tutorAvailabilityExceptionsMap.set(id, exc);
    return exc;
  }

  async deleteTutorException(id: number, tutorId?: number): Promise<boolean> {
    await this.ensureInitialized();
    if (tutorId !== undefined) {
      const exc = this.tutorAvailabilityExceptionsMap.get(id);
      if (!exc || exc.tutorId !== tutorId) return false;
    }
    return this.tutorAvailabilityExceptionsMap.delete(id);
  }

  // Conflict Detection
  async getTutorClassesForDate(tutorId: number, date: Date): Promise<Class[]> {
    await this.ensureInitialized();
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.classes.values())
      .filter(c =>
        c.tutorId === tutorId &&
        c.status === 'scheduled' &&
        new Date(c.scheduledAt).toISOString().split('T')[0] === dateStr
      );
  }

  async checkConflict(tutorId: number, scheduledAt: Date, duration: number): Promise<boolean> {
    await this.ensureInitialized();
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + duration * 60 * 1000;

    return Array.from(this.classes.values()).some(c => {
      if (c.tutorId !== tutorId || c.status !== 'scheduled') return false;
      const existingStart = new Date(c.scheduledAt).getTime();
      const existingEnd = existingStart + (c.duration || 60) * 60 * 1000;
      return newStart < existingEnd && newEnd > existingStart;
    });
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    await this.ensureInitialized();
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    await this.ensureInitialized();
    const id = this.currentNotificationId++;
    const notification: Notification = {
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || null,
      isRead: false,
      createdAt: new Date(),
    };
    this.notificationsMap.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: number, userId?: number): Promise<boolean> {
    await this.ensureInitialized();
    const n = this.notificationsMap.get(id);
    if (!n) return false;
    if (userId !== undefined && n.userId !== userId) return false;
    n.isRead = true;
    return true;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await this.ensureInitialized();
    Array.from(this.notificationsMap.values()).forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    await this.ensureInitialized();
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId && !n.isRead).length;
  }

  // Achievements
  async getAchievements(userId: number): Promise<Achievement[]> {
    await this.ensureInitialized();
    return Array.from(this.achievementsMap.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0));
  }

  async createAchievement(data: InsertAchievement): Promise<Achievement> {
    await this.ensureInitialized();
    const id = this.currentAchievementId++;
    const achievement: Achievement = {
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      description: data.description,
      icon: data.icon,
      unlockedAt: new Date(),
    };
    this.achievementsMap.set(id, achievement);
    return achievement;
  }

  async hasAchievement(userId: number, type: string): Promise<boolean> {
    await this.ensureInitialized();
    return Array.from(this.achievementsMap.values())
      .some(a => a.userId === userId && a.type === type);
  }

  // Support Tickets
  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    await this.ensureInitialized();
    const id = this.currentSupportTicketId++;
    const ticket: SupportTicket = {
      id,
      userId: data.userId,
      subject: data.subject,
      category: data.category,
      status: data.status || "open",
      priority: data.priority || "normal",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.supportTicketsMap.set(id, ticket);
    return ticket;
  }

  async getSupportTickets(userId?: number): Promise<SupportTicket[]> {
    await this.ensureInitialized();
    let tickets = Array.from(this.supportTicketsMap.values());
    if (userId) tickets = tickets.filter(t => t.userId === userId);
    return tickets.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    await this.ensureInitialized();
    return this.supportTicketsMap.get(id);
  }

  async updateSupportTicket(id: number, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    await this.ensureInitialized();
    const ticket = this.supportTicketsMap.get(id);
    if (!ticket) return undefined;
    const updated = { ...ticket, ...data, updatedAt: new Date() };
    this.supportTicketsMap.set(id, updated);
    return updated;
  }

  async getSupportMessages(ticketId: number): Promise<SupportMessage[]> {
    await this.ensureInitialized();
    return Array.from(this.supportMessagesMap.values())
      .filter(m => m.ticketId === ticketId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    await this.ensureInitialized();
    const id = this.currentSupportMessageId++;
    const message: SupportMessage = {
      id,
      ticketId: data.ticketId,
      userId: data.userId,
      message: data.message,
      isAdmin: data.isAdmin || false,
      createdAt: new Date(),
    };
    this.supportMessagesMap.set(id, message);
    // Update ticket updatedAt
    const ticket = this.supportTicketsMap.get(data.ticketId);
    if (ticket) ticket.updatedAt = new Date();
    return message;
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

  // Direct Messaging
  async getConversations(userId: number) {
    await this.ensureInitialized();
    return Array.from(this.conversationsMap.values())
      .filter(c => c.participantA === userId || c.participantB === userId)
      .sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));
  }

  async getOrCreateConversation(userA: number, userB: number) {
    await this.ensureInitialized();
    const existing = Array.from(this.conversationsMap.values()).find(
      c => (c.participantA === userA && c.participantB === userB) ||
           (c.participantA === userB && c.participantB === userA)
    );
    if (existing) return existing;
    const id = this.currentConversationId++;
    const conv: Conversation = { id, participantA: userA, participantB: userB, lastMessageAt: new Date(), createdAt: new Date() };
    this.conversationsMap.set(id, conv);
    return conv;
  }

  async getMessages(conversationId: number, limit = 50, offset = 0) {
    await this.ensureInitialized();
    return Array.from(this.directMessagesMap.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
      .slice(offset, offset + limit);
  }

  async createMessage(data: InsertDirectMessage) {
    await this.ensureInitialized();
    const id = this.currentDirectMessageId++;
    const msg: DirectMessage = { id, ...data, isRead: false, createdAt: new Date() };
    this.directMessagesMap.set(id, msg);
    const conv = this.conversationsMap.get(data.conversationId);
    if (conv) conv.lastMessageAt = new Date();
    return msg;
  }

  async markMessagesAsRead(conversationId: number, userId: number) {
    await this.ensureInitialized();
    for (const msg of Array.from(this.directMessagesMap.values())) {
      if (msg.conversationId === conversationId && msg.senderId !== userId) {
        msg.isRead = true;
      }
    }
  }

  async getUnreadMessageCount(userId: number) {
    await this.ensureInitialized();
    const convs = await this.getConversations(userId);
    let count = 0;
    for (const conv of convs) {
      for (const msg of Array.from(this.directMessagesMap.values())) {
        if (msg.conversationId === conv.id && msg.senderId !== userId && !msg.isRead) count++;
      }
    }
    return count;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: number) {
    await this.ensureInitialized();
    return Array.from(this.notifPrefsMap.values()).find(p => p.userId === userId);
  }

  async upsertNotificationPreferences(userId: number, prefs: Partial<InsertUserNotificationPreferences>) {
    await this.ensureInitialized();
    const existing = Array.from(this.notifPrefsMap.values()).find(p => p.userId === userId);
    if (existing) {
      Object.assign(existing, prefs);
      return existing;
    }
    const id = this.currentNotifPrefsId++;
    const np: UserNotificationPreferences = {
      id, userId,
      emailBooking: prefs.emailBooking ?? true,
      emailCancellation: prefs.emailCancellation ?? true,
      emailReminder: prefs.emailReminder ?? true,
      emailMessages: prefs.emailMessages ?? true,
      emailAchievements: prefs.emailAchievements ?? true,
    };
    this.notifPrefsMap.set(id, np);
    return np;
  }

  // Payment History
  async getPaymentHistory(userId: number) {
    await this.ensureInitialized();
    return Array.from(this.classPurchasesMap.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Email Campaign Events
  async getEmailCampaignEvents(userId: number): Promise<EmailCampaignEvent[]> {
    await this.ensureInitialized();
    return Array.from(this.campaignEventsMap.values()).filter(e => e.userId === userId);
  }

  async createEmailCampaignEvent(userId: number, step: string): Promise<EmailCampaignEvent> {
    await this.ensureInitialized();
    const id = this.currentCampaignEventId++;
    const event: EmailCampaignEvent = { id, userId, campaignStep: step, sentAt: new Date() };
    this.campaignEventsMap.set(id, event);
    return event;
  }

  // CRM
  async getStudentsCRM(params: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ students: User[]; total: number }> {
    await this.ensureInitialized();
    let students = Array.from(this.users.values()).filter(u => u.userType !== "admin" && u.userType !== "tutor");
    if (params.status) students = students.filter(u => u.userType === params.status);
    if (params.search) {
      const s = params.search.toLowerCase();
      students = students.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s)
      );
    }
    const total = students.length;
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    return { students: students.slice(offset, offset + limit), total };
  }

  // Atomic credit operations
  async deductClassCredit(userId: number): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (!user || (user.classCredits || 0) <= 0) return undefined;
    user.classCredits = (user.classCredits || 0) - 1;
    return user;
  }

  async refundClassCredit(userId: number): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.classCredits = (user.classCredits || 0) + 1;
    return user;
  }

  // Atomic class completion
  async completeClassIfScheduled(classId: number): Promise<Class | undefined> {
    await this.ensureInitialized();
    const cls = this.classes.get(classId);
    if (!cls || cls.status !== "scheduled") return undefined;
    cls.status = "completed";
    return cls;
  }

  // Tutor-specific class query
  async getClassesByTutor(tutorId: number): Promise<Class[]> {
    await this.ensureInitialized();
    return Array.from(this.classes.values()).filter(c => c.tutorId === tutorId);
  }

  // CRM Notes (MemStorage stubs)
  async getCrmNotes(_userId: number): Promise<CrmNote[]> { return []; }
  async createCrmNote(data: InsertCrmNote): Promise<CrmNote> {
    return { id: 1, ...data, createdAt: new Date() } as CrmNote;
  }
  async deleteCrmNote(_id: number): Promise<boolean> { return true; }

  // CRM Tasks (MemStorage stubs)
  async getCrmTasks(_params: { userId?: number; assignedTo?: number; status?: string }): Promise<CrmTask[]> { return []; }
  async createCrmTask(data: InsertCrmTask): Promise<CrmTask> {
    return { id: 1, ...data, status: "pending", completedAt: null, createdAt: new Date() } as CrmTask;
  }
  async updateCrmTask(_id: number, _data: Partial<InsertCrmTask & { status: string; completedAt: Date | null }>): Promise<CrmTask | undefined> { return undefined; }
  async deleteCrmTask(_id: number): Promise<boolean> { return true; }

  // CRM Tags (MemStorage stubs)
  async getAllCrmTags(): Promise<CrmTag[]> { return []; }
  async createCrmTag(data: InsertCrmTag): Promise<CrmTag> {
    return { id: 1, ...data, createdAt: new Date() } as CrmTag;
  }
  async deleteCrmTag(_id: number): Promise<boolean> { return true; }
  async getUserCrmTags(_userId: number): Promise<CrmTag[]> { return []; }
  async addUserCrmTag(_userId: number, _tagId: number): Promise<void> {}
  async removeUserCrmTag(_userId: number, _tagId: number): Promise<void> {}

  // CRM Metrics (MemStorage stubs)
  async getCrmFunnel(): Promise<{ stage: string; count: number }[]> { return []; }

  // Delete User (cascading)
  async deleteUser(id: number) {
    await this.ensureInitialized();
    // Helper to delete matching entries from a map
    const deleteFrom = <T>(map: Map<number, T>, pred: (v: T) => boolean) => {
      for (const [key, val] of Array.from(map.entries())) {
        if (pred(val)) map.delete(key);
      }
    };
    deleteFrom(this.notificationsMap, n => n.userId === id);
    deleteFrom(this.achievementsMap, a => a.userId === id);
    deleteFrom(this.userProgress, p => p.userId === id);
    deleteFrom(this.reviewsMap, r => r.userId === id);
    deleteFrom(this.conversationsMap, c => c.participantA === id || c.participantB === id);
    deleteFrom(this.directMessagesMap, m => m.senderId === id);
    deleteFrom(this.supportTicketsMap, t => t.userId === id);
    deleteFrom(this.supportMessagesMap, m => m.userId === id);
    deleteFrom(this.aiConversationsMap, c => c.userId === id);
    deleteFrom(this.classes, c => c.userId === id);
    deleteFrom(this.subscriptions, s => s.userId === id);
    deleteFrom(this.classPurchasesMap, p => p.userId === id);
    deleteFrom(this.notifPrefsMap, p => p.userId === id);
    return this.users.delete(id);
  }

  // ===== Campaign System Stubs (MemStorage) =====
  async getEmailTemplates(): Promise<EmailTemplate[]> { return []; }
  async getEmailTemplate(_id: number): Promise<EmailTemplate | undefined> { return undefined; }
  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> { return { id: 1, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() } as EmailTemplate; }
  async updateEmailTemplate(_id: number, _data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> { return undefined; }
  async deleteEmailTemplate(_id: number): Promise<boolean> { return false; }

  async getAudienceSegments(): Promise<AudienceSegment[]> { return []; }
  async getAudienceSegment(_id: number): Promise<AudienceSegment | undefined> { return undefined; }
  async createAudienceSegment(data: InsertAudienceSegment): Promise<AudienceSegment> { return { id: 1, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() } as AudienceSegment; }
  async updateAudienceSegment(_id: number, _data: Partial<InsertAudienceSegment>): Promise<AudienceSegment | undefined> { return undefined; }
  async deleteAudienceSegment(_id: number): Promise<boolean> { return false; }

  async getCampaigns(): Promise<Campaign[]> { return []; }
  async getCampaign(_id: number): Promise<Campaign | undefined> { return undefined; }
  async createCampaign(data: InsertCampaign): Promise<Campaign> { return { id: 1, ...data, totalRecipients: 0, totalSent: 0, totalOpened: 0, totalClicked: 0, createdAt: new Date(), updatedAt: new Date() } as Campaign; }
  async updateCampaign(_id: number, _data: Partial<InsertCampaign>): Promise<Campaign | undefined> { return undefined; }
  async deleteCampaign(_id: number): Promise<boolean> { return false; }

  async getCampaignRecipients(_campaignId: number): Promise<CampaignRecipient[]> { return []; }
  async createCampaignRecipient(data: InsertCampaignRecipient): Promise<CampaignRecipient> { return { id: 1, ...data, createdAt: new Date() } as CampaignRecipient; }

  async getOffers(): Promise<Offer[]> { return []; }
  async getOffer(_id: number): Promise<Offer | undefined> { return undefined; }
  async getOfferByCode(_code: string): Promise<Offer | undefined> { return undefined; }
  async getOfferByStripePromotionCodeId(_promoCodeId: string): Promise<Offer | undefined> { return undefined; }
  async createOffer(data: InsertOffer): Promise<Offer> { return { id: 1, ...data, usedCount: 0, stripeCouponId: null, stripePromotionCodeId: null, createdAt: new Date() } as Offer; }
  async updateOffer(_id: number, _data: Partial<Offer>): Promise<Offer | undefined> { return undefined; }
  async deleteOffer(_id: number): Promise<boolean> { return false; }
  async incrementOfferUsage(_id: number): Promise<void> {}

  async getCommunicationLog(_userId: number): Promise<CommunicationLogEntry[]> { return []; }
  async createCommunicationLog(data: InsertCommunicationLog): Promise<CommunicationLogEntry> { return { id: 1, ...data, createdAt: new Date() } as CommunicationLogEntry; }

  async getRecipientByResendId(_resendMessageId: string): Promise<CampaignRecipient | undefined> { return undefined; }
  async updateCampaignRecipient(_id: number, _data: Partial<CampaignRecipient>): Promise<void> {}
  async incrementCampaignOpened(_campaignId: number): Promise<void> {}
  async incrementCampaignClicked(_campaignId: number): Promise<void> {}

  async getNewsletterSubscribers(_filters?: any): Promise<{ subscribers: NewsletterSubscriber[]; total: number; metrics: any }> { return { subscribers: [], total: 0, metrics: {} }; }
  async createNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> { return { id: 1, ...data, subscribedAt: new Date(), unsubscribedAt: null } as NewsletterSubscriber; }
  async upsertNewsletterSubscriber(data: any): Promise<NewsletterSubscriber> { return { id: 1, ...data, subscribedAt: new Date(), unsubscribedAt: null } as NewsletterSubscriber; }
  async unsubscribeNewsletter(_email: string): Promise<void> {}
  async deleteNewsletterSubscriber(_id: number): Promise<boolean> { return false; }

  async createStripeEvent(data: InsertStripeEvent): Promise<StripeEvent> { return { id: 1, ...data, createdAt: new Date() } as StripeEvent; }
  async getStripeEvents(_eventType?: string, _from?: Date, _to?: Date): Promise<StripeEvent[]> { return []; }
  async getClassPurchaseByPaymentIntent(_paymentIntentId: string): Promise<ClassPurchase | undefined> { return undefined; }
  async updateClassPurchase(_id: number, _data: Partial<ClassPurchase>): Promise<ClassPurchase | undefined> { return undefined; }

  // ===== Learning Path Stubs (MemStorage) =====
  async getStationsByLevel(_level: string): Promise<LearningPathStation[]> { return []; }
  async getStation(_id: number): Promise<LearningPathStation | undefined> { return undefined; }
  async getAllStations(): Promise<LearningPathStation[]> { return []; }
  async createStation(data: InsertLearningPathStation): Promise<LearningPathStation> { return { id: 1, ...data, requiredToAdvance: true, createdAt: new Date() } as LearningPathStation; }
  async deleteStation(_id: number): Promise<void> { }

  async getContentByStation(_stationId: number): Promise<LearningPathContent[]> { return []; }
  async getContent(_id: number): Promise<LearningPathContent | undefined> { return undefined; }
  async createContent(data: InsertLearningPathContent): Promise<LearningPathContent> { return { id: 1, ...data, durationMinutes: 15, sortOrder: 0, createdAt: new Date() } as LearningPathContent; }
  async updateContent(_id: number, _data: Partial<InsertLearningPathContent>): Promise<LearningPathContent> { return {} as LearningPathContent; }
  async deleteContent(_id: number): Promise<void> { }

  async getStudentProgress(_userId: number): Promise<StudentPathProgress[]> { return []; }
  async getStudentStationProgress(_userId: number, _stationId: number): Promise<StudentPathProgress | undefined> { return undefined; }
  async upsertStudentProgress(data: InsertStudentPathProgress): Promise<StudentPathProgress> { return { id: 1, ...data, createdAt: new Date() } as StudentPathProgress; }

  async createQuizAttempt(data: InsertStudentQuizAttempt): Promise<StudentQuizAttempt> { return { id: 1, ...data, createdAt: new Date() } as StudentQuizAttempt; }
  async getQuizAttempts(_userId: number, _contentId: number): Promise<StudentQuizAttempt[]> { return []; }
  async getQuizAttemptsByUser(_userId: number): Promise<StudentQuizAttempt[]> { return []; }

  async createAssignment(data: InsertTutorAssignment): Promise<TutorAssignment> { return { id: 1, ...data, createdAt: new Date() } as TutorAssignment; }
  async getAssignmentsForStudent(_studentId: number): Promise<TutorAssignment[]> { return []; }
  async getAssignmentsByTutor(_tutorId: number): Promise<TutorAssignment[]> { return []; }
  async updateAssignment(_id: number, _data: Partial<InsertTutorAssignment>): Promise<TutorAssignment> { return {} as TutorAssignment; }

  async getLevelRules(_fromLevel: string): Promise<LevelProgressionRule | undefined> { return undefined; }
  async getAllLevelRules(): Promise<LevelProgressionRule[]> { return []; }
  async upsertLevelRule(data: InsertLevelProgressionRule): Promise<LevelProgressionRule> { return { id: 1, ...data, autoPromote: true, createdAt: new Date() } as LevelProgressionRule; }

  // Google OAuth Tokens (MemStorage stubs)
  private googleTokens: Map<number, TutorGoogleToken> = new Map();
  async getTutorGoogleToken(tutorId: number): Promise<TutorGoogleToken | undefined> {
    return Array.from(this.googleTokens.values()).find(t => t.tutorId === tutorId);
  }
  async upsertTutorGoogleToken(data: InsertTutorGoogleToken): Promise<TutorGoogleToken> {
    const existing = await this.getTutorGoogleToken(data.tutorId);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.googleTokens.set(existing.id, updated);
      return updated;
    }
    const id = this.googleTokens.size + 1;
    const token: TutorGoogleToken = { id, ...data, googleCalendarId: data.googleCalendarId || "primary", createdAt: new Date(), updatedAt: new Date() };
    this.googleTokens.set(id, token);
    return token;
  }
  async deleteTutorGoogleToken(tutorId: number): Promise<boolean> {
    const token = await this.getTutorGoogleToken(tutorId);
    if (token) { this.googleTokens.delete(token.id); return true; }
    return false;
  }
  async updateTutorGoogleToken(tutorId: number, data: Partial<InsertTutorGoogleToken>): Promise<TutorGoogleToken | undefined> {
    const token = await this.getTutorGoogleToken(tutorId);
    if (!token) return undefined;
    const updated = { ...token, ...data, updatedAt: new Date() };
    this.googleTokens.set(token.id, updated as TutorGoogleToken);
    return updated as TutorGoogleToken;
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
