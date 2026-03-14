import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, time, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  googleId: text("google_id").unique(),
  microsoftId: text("microsoft_id").unique(),
  phone: text("phone"), // Capturado en free trial
  level: text("level").notNull().default("A1"),
  avatar: text("avatar"),
  // Estados del usuario en el funnel
  userType: text("user_type").notNull().default("trial"), // 'trial', 'lead', 'customer'
  trialCompleted: boolean("trial_completed").default(false),
  // Créditos de clases (sistema similar a Preply)
  classCredits: integer("class_credits").default(1), // 1 clase gratis inicial
  // Trial tracking
  trialTutorId: integer("trial_tutor_id"),
  // Stripe para pagos
  stripeCustomerId: text("stripe_customer_id"),
  // AI Practice Partner
  aiSubscriptionActive: boolean("ai_subscription_active").default(false),
  aiMessagesUsed: integer("ai_messages_used").default(0),
  aiMessagesResetAt: timestamp("ai_messages_reset_at"),
  timezone: text("timezone").default("America/New_York"),
  currency: text("currency").default("USD"),
  profileImage: text("profile_image"),
  autoconfirmMode: text("autoconfirm_mode").default("all"), // 'self_only' | 'all'
  calendarConnected: boolean("calendar_connected").default(false),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Planes de suscripción disponibles
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Basic", "Premium", "Unlimited"
  type: text("type").notNull(), // 'monthly', 'yearly', 'lifetime'
  classesIncluded: integer("classes_included"), // null para unlimited
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").default(0),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Paquetes de clases individuales (como Preply)
export const classPackages = pgTable("class_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "5 Classes", "10 Classes", etc.
  classCount: integer("class_count").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").default(0),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Suscripciones activas de usuarios
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  nextBillingDate: timestamp("next_billing_date"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_user_id").on(table.userId),
]);

// Compras de paquetes de clases
export const classPurchases = pgTable("class_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  packageId: integer("package_id").references(() => classPackages.id).notNull(),
  classesAdded: integer("classes_added").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("completed"), // 'pending', 'completed', 'refunded'
  refundedAt: timestamp("refunded_at"),
  refundId: text("refund_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_class_purchases_user_id").on(table.userId),
]);

export const tutors = pgTable("tutors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  specialization: text("specialization").notNull(),
  specializationEs: text("specialization_es"),
  bio: text("bio"),
  bioEs: text("bio_es"),
  avatar: text("avatar"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  reviewCount: integer("review_count").default(0),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  // Categoría de clase que enseña
  classType: text("class_type").notNull().default("adults"), // 'adults' | 'kids'
  languageTaught: text("language_taught").notNull().default("spanish"), // 'spanish' | 'english'
  // Información adicional para profesores
  phone: text("phone"),
  country: text("country"),
  timezone: text("timezone"),
  languages: text("languages").array(),
  certifications: text("certifications").array(),
  yearsOfExperience: integer("years_of_experience"),
  // Vinculación con cuenta de usuario para login de tutores
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tutors_user_id").on(table.userId),
]);

// Nueva tabla para disponibilidad de tutores (recurrente semanal)
export const tutorAvailability = pgTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Domingo, 1=Lunes, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tutor_availability_tutor_id").on(table.tutorId),
]);

// Excepciones de disponibilidad (vacaciones, días especiales)
export const tutorAvailabilityExceptions = pgTable("tutor_availability_exceptions", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  date: timestamp("date").notNull(),
  isBlocked: boolean("is_blocked").default(true), // true=bloqueado, false=disponibilidad extra
  startTime: time("start_time"), // null si todo el día bloqueado
  endTime: time("end_time"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tutor_avail_exceptions_tutor_id").on(table.tutorId),
]);

// Notificaciones in-app
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'booking', 'cancellation', 'reminder', 'system', 'review'
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user_read").on(table.userId, table.isRead),
]);

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  isTrial: boolean("is_trial").default(false),
  classCategory: text("class_category"), // 'adults-spanish', 'kids-spanish', etc.
  meetingLink: text("meeting_link"),
  calendarEventId: text("calendar_event_id"),
  tutorCalendarEventId: text("tutor_calendar_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_classes_user_id").on(table.userId),
  index("idx_classes_tutor_id").on(table.tutorId),
  index("idx_classes_status_scheduled").on(table.status, table.scheduledAt),
]);

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  instructor: text("instructor").notNull(),
  level: text("level").notNull(), // 'Beginner', 'Intermediate', 'Advanced', 'All Levels'
  duration: text("duration").notNull(), // "24:15" format
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  level: text("level"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  preferredContact: text("preferred_contact"),
  status: text("status").notNull().default("new"), // 'new', 'read', 'replied'
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  classId: integer("class_id").references(() => classes.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_reviews_tutor_id").on(table.tutorId),
  index("idx_reviews_user_id").on(table.userId),
]);

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  classesCompleted: integer("classes_completed").default(0),
  learningHours: decimal("learning_hours", { precision: 10, scale: 2 }).default("0.00"),
  currentStreak: integer("current_streak").default(0),
  totalVideosWatched: integer("total_videos_watched").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_progress_user_id").on(table.userId),
]);

// AI Practice Partner tables
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull().default("New Conversation"),
  language: text("language").notNull().default("spanish"), // 'spanish' | 'english'
  mode: text("mode").notNull().default("chat"), // 'chat' | 'voice' | 'grammar'
  scenario: text("scenario"), // scenario id or null for free conversation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ai_conversations_user_id").on(table.userId),
]);

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => aiConversations.id).notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  corrections: jsonb("corrections"), // JSON array of grammar corrections
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_messages_conversation_id").on(table.conversationId),
]);

// AI Student Profile (for context memory)
export const aiStudentProfiles = pgTable("ai_student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  detectedLevel: text("detected_level").default("A1"), // A1-C2
  interests: jsonb("interests").$type<string[]>().default([]),
  commonErrors: jsonb("common_errors").$type<{ original: string; corrected: string; count: number }[]>().default([]),
  recentVocabulary: jsonb("recent_vocabulary").$type<string[]>().default([]),
  practiceStreak: integer("practice_streak").default(0),
  lastPracticeDate: timestamp("last_practice_date"),
  totalMessages: integer("total_messages").default(0),
  totalConversations: integer("total_conversations").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Saved Corrections (for review/export)
export const aiSavedCorrections = pgTable("ai_saved_corrections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  messageId: integer("message_id").references(() => aiMessages.id),
  original: text("original").notNull(),
  corrected: text("corrected").notNull(),
  explanation: text("explanation"),
  language: text("language").notNull().default("spanish"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Vocabulary Bank
export const aiVocabulary = pgTable("ai_vocabulary", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  messageId: integer("message_id").references(() => aiMessages.id),
  word: text("word").notNull(),
  translation: text("translation").notNull(),
  context: text("context"), // example sentence where the word appeared
  language: text("language").notNull().default("spanish"),
  mastery: integer("mastery").default(0), // 0=new, 1=seen, 2=learning, 3=mastered
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_vocabulary_user_id").on(table.userId),
]);

// Achievements / Gamification
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(), // 'technical', 'complaint', 'compliment', 'help', 'other'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_user_id").on(table.userId),
]);

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_support_messages_ticket_id").on(table.ticketId),
]);

// Direct messaging between users
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participantA: integer("participant_a").references(() => users.id).notNull(),
  participantB: integer("participant_b").references(() => users.id).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_conversations_participant_a").on(table.participantA),
  index("idx_conversations_participant_b").on(table.participantB),
]);

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_direct_messages_conv_read").on(table.conversationId, table.isRead),
]);

// User notification preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailBooking: boolean("email_booking").default(true),
  emailCancellation: boolean("email_cancellation").default(true),
  emailReminder: boolean("email_reminder").default(true),
  emailMessages: boolean("email_messages").default(true),
  emailAchievements: boolean("email_achievements").default(true),
});

// Email campaign tracking for drip campaigns
export const emailCampaignEvents = pgTable("email_campaign_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignStep: text("campaign_step").notNull(), // 'welcome', 'pre_class_tips', 'feedback_request', 'discount_reminder', 'last_chance'
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => [
  index("idx_campaign_events_user").on(table.userId),
]);

// CRM Notes
export const crmNotes = pgTable("crm_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_notes_user_id").on(table.userId),
]);

// CRM Tasks
export const crmTasks = pgTable("crm_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  status: text("status").notNull().default("pending"), // 'pending' | 'completed'
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_tasks_user_id").on(table.userId),
  index("idx_crm_tasks_assigned_to").on(table.assignedTo),
]);

// CRM Tags
export const crmTags = pgTable("crm_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#1C7BB1"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM User Tags (many-to-many)
export const crmUserTags = pgTable("crm_user_tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tagId: integer("tag_id").references(() => crmTags.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_user_tags_user_id").on(table.userId),
]);

// ===== CRM Campaign System =====

// Email/SMS templates with merge tags
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("email"), // 'email' | 'sms'
  category: text("category").notNull().default("marketing"), // 'marketing' | 'transactional'
  language: text("language").notNull().default("es"), // 'es' | 'en'
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic audience segments built from filter rules
export const audienceSegments = pgTable("audience_segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filters: jsonb("filters").notNull(), // { logic: "AND"|"OR", rules: [{ field, operator, value }] }
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email/SMS campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  templateId: integer("template_id").references(() => emailTemplates.id),
  segmentId: integer("segment_id").references(() => audienceSegments.id),
  channel: text("channel").notNull().default("email"), // 'email' | 'sms'
  status: text("status").notNull().default("draft"), // 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  offerId: integer("offer_id").references(() => offers.id),
  totalRecipients: integer("total_recipients").default(0),
  totalSent: integer("total_sent").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual send records per campaign recipient
export const campaignRecipients = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced'
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  renderedSubject: text("rendered_subject"),
  resendMessageId: text("resend_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_recipients_campaign").on(table.campaignId),
  index("idx_campaign_recipients_user").on(table.userId),
]);

// Discount/promotional offers
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // 'percentage' | 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  applicableTo: text("applicable_to").notNull().default("all"), // 'all' | 'packages' | 'subscriptions'
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  stripeCouponId: text("stripe_coupon_id"),
  stripePromotionCodeId: text("stripe_promotion_code_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Unified communication timeline per student
export const communicationLog = pgTable("communication_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  channel: text("channel").notNull(), // 'email' | 'sms' | 'in_app' | 'drip'
  direction: text("direction").notNull().default("outbound"), // 'outbound' | 'inbound'
  subject: text("subject"),
  body: text("body"),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  status: text("status").notNull().default("sent"), // 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'
  sentBy: integer("sent_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_comm_log_user").on(table.userId),
  index("idx_comm_log_campaign").on(table.campaignId),
]);

// Stripe events cache for analytics
export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'subscription_cancelled' | 'charge_refunded' | 'payment_failed'
  stripeEventId: text("stripe_event_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  userId: integer("user_id").references(() => users.id),
  amount: integer("amount"), // en centavos
  currency: text("currency").default("usd"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Newsletter subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  source: text("source").notNull().default("website"), // 'website' | 'contact_form' | 'checkout' | 'manual'
  status: text("status").notNull().default("active"), // 'active' | 'unsubscribed' | 'bounced'
  userId: integer("user_id").references(() => users.id),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

// ===== Learning Path "Culebrita" =====

// Estaciones del camino de aprendizaje
export const learningPathStations = pgTable("learning_path_stations", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // A1, A2, B1, B2, C1, C2
  stationOrder: integer("station_order").notNull(), // Order within the level
  title: text("title").notNull(),
  titleEs: text("title_es").notNull(),
  description: text("description"),
  descriptionEs: text("description_es"),
  stationType: text("station_type").notNull().default("lesson"), // lesson, quiz, activity, milestone
  requiredToAdvance: boolean("required_to_advance").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lp_stations_level").on(table.level),
  index("idx_lp_stations_order").on(table.level, table.stationOrder),
]);

// Contenido dentro de cada estación
export const learningPathContent = pgTable("learning_path_content", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").references(() => learningPathStations.id).notNull(),
  contentType: text("content_type").notNull(), // document, quiz, video, exercise
  title: text("title").notNull(),
  titleEs: text("title_es").notNull(),
  description: text("description"),
  descriptionEs: text("description_es"),
  contentData: jsonb("content_data"), // quiz questions, document content, exercise config
  durationMinutes: integer("duration_minutes").default(15),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lp_content_station_id").on(table.stationId),
]);

// Progreso del estudiante por estación
export const studentPathProgress = pgTable("student_path_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stationId: integer("station_id").references(() => learningPathStations.id).notNull(),
  status: text("status").notNull().default("locked"), // locked, available, in_progress, completed
  score: integer("score"), // For quiz stations
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_spp_user_id").on(table.userId),
  index("idx_spp_station_id").on(table.stationId),
  uniqueIndex("idx_spp_user_station").on(table.userId, table.stationId),
]);

// Intentos de quiz
export const studentQuizAttempts = pgTable("student_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contentId: integer("content_id").references(() => learningPathContent.id).notNull(),
  answers: jsonb("answers"), // Student's submitted answers
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  passed: boolean("passed").notNull().default(false),
  attemptNumber: integer("attempt_number").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sqa_user_id").on(table.userId),
  index("idx_sqa_content_id").on(table.contentId),
]);

// Asignaciones de tutor a estudiante
export const tutorAssignments = pgTable("tutor_assignments", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  contentId: integer("content_id").references(() => learningPathContent.id).notNull(),
  stationId: integer("station_id").references(() => learningPathStations.id),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  status: text("status").notNull().default("assigned"), // assigned, in_progress, completed, overdue
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ta_tutor_id").on(table.tutorId),
  index("idx_ta_student_id").on(table.studentId),
  index("idx_ta_status").on(table.status),
]);

// Reglas de progresión de nivel
export const levelProgressionRules = pgTable("level_progression_rules", {
  id: serial("id").primaryKey(),
  fromLevel: text("from_level").notNull(), // A1, A2, B1, B2, C1
  toLevel: text("to_level").notNull(), // A2, B1, B2, C1, C2
  requiredClassesCompleted: integer("required_classes_completed").notNull().default(4),
  requiredQuizAvgScore: integer("required_quiz_avg_score").notNull().default(70), // 0-100
  requiredStationsCompleted: integer("required_stations_completed").notNull().default(6),
  autoPromote: boolean("auto_promote").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lpr_from_level").on(table.fromLevel),
]);

export const tutorGoogleTokens = pgTable("tutor_google_tokens", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull().unique(),
  googleEmail: text("google_email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  googleCalendarId: text("google_calendar_id").notNull().default("primary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  googleId: true,
  microsoftId: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertClassPackageSchema = createInsertSchema(classPackages).omit({
  id: true,
  createdAt: true,
});

export const insertClassPurchaseSchema = createInsertSchema(classPurchases).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertTutorSchema = createInsertSchema(tutors).omit({
  id: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  updatedAt: true,
});

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
  createdAt: true,
});

export const insertTutorAvailabilityExceptionSchema = createInsertSchema(tutorAvailabilityExceptions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiStudentProfileSchema = createInsertSchema(aiStudentProfiles).omit({
  id: true,
  updatedAt: true,
});

export const insertAiSavedCorrectionSchema = createInsertSchema(aiSavedCorrections).omit({
  id: true,
  createdAt: true,
});

export const insertAiVocabularySchema = createInsertSchema(aiVocabulary).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
});

export const insertEmailCampaignEventSchema = createInsertSchema(emailCampaignEvents).omit({
  id: true,
  sentAt: true,
});

export const insertCrmNoteSchema = createInsertSchema(crmNotes).omit({
  id: true,
  createdAt: true,
});

export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCrmTagSchema = createInsertSchema(crmTags).omit({
  id: true,
  createdAt: true,
});

export const insertCrmUserTagSchema = createInsertSchema(crmUserTags).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAudienceSegmentSchema = createInsertSchema(audienceSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});

export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).omit({
  id: true,
  createdAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  usedCount: true,
  stripeCouponId: true,
  stripePromotionCodeId: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLog).omit({
  id: true,
  createdAt: true,
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  id: true,
  createdAt: true,
});

// Learning Path insert schemas
export const insertLearningPathStationSchema = createInsertSchema(learningPathStations).omit({
  id: true,
  createdAt: true,
});

export const insertLearningPathContentSchema = createInsertSchema(learningPathContent).omit({
  id: true,
  createdAt: true,
});

export const insertStudentPathProgressSchema = createInsertSchema(studentPathProgress).omit({
  id: true,
  createdAt: true,
});

export const insertStudentQuizAttemptSchema = createInsertSchema(studentQuizAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertTutorAssignmentSchema = createInsertSchema(tutorAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertLevelProgressionRuleSchema = createInsertSchema(levelProgressionRules).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type ClassPackage = typeof classPackages.$inferSelect;
export type InsertClassPackage = z.infer<typeof insertClassPackageSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type ClassPurchase = typeof classPurchases.$inferSelect;
export type InsertClassPurchase = z.infer<typeof insertClassPurchaseSchema>;

export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = z.infer<typeof insertTutorSchema>;

export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;

export type TutorAvailabilityException = typeof tutorAvailabilityExceptions.$inferSelect;
export type InsertTutorAvailabilityException = z.infer<typeof insertTutorAvailabilityExceptionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;

export type AiStudentProfile = typeof aiStudentProfiles.$inferSelect;
export type InsertAiStudentProfile = z.infer<typeof insertAiStudentProfileSchema>;

export type AiSavedCorrection = typeof aiSavedCorrections.$inferSelect;
export type InsertAiSavedCorrection = z.infer<typeof insertAiSavedCorrectionSchema>;

export type AiVocabulary = typeof aiVocabulary.$inferSelect;
export type InsertAiVocabulary = z.infer<typeof insertAiVocabularySchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;

export type EmailCampaignEvent = typeof emailCampaignEvents.$inferSelect;
export type InsertEmailCampaignEvent = z.infer<typeof insertEmailCampaignEventSchema>;

export type CrmNote = typeof crmNotes.$inferSelect;
export type InsertCrmNote = z.infer<typeof insertCrmNoteSchema>;

export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;

export type CrmTag = typeof crmTags.$inferSelect;
export type InsertCrmTag = z.infer<typeof insertCrmTagSchema>;

export type CrmUserTag = typeof crmUserTags.$inferSelect;
export type InsertCrmUserTag = z.infer<typeof insertCrmUserTagSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type AudienceSegment = typeof audienceSegments.$inferSelect;
export type InsertAudienceSegment = z.infer<typeof insertAudienceSegmentSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

export type CommunicationLogEntry = typeof communicationLog.$inferSelect;
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;

export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;

// Learning Path types
export type LearningPathStation = typeof learningPathStations.$inferSelect;
export type InsertLearningPathStation = z.infer<typeof insertLearningPathStationSchema>;

export type LearningPathContent = typeof learningPathContent.$inferSelect;
export type InsertLearningPathContent = z.infer<typeof insertLearningPathContentSchema>;

export type StudentPathProgress = typeof studentPathProgress.$inferSelect;
export type InsertStudentPathProgress = z.infer<typeof insertStudentPathProgressSchema>;

export type StudentQuizAttempt = typeof studentQuizAttempts.$inferSelect;
export type InsertStudentQuizAttempt = z.infer<typeof insertStudentQuizAttemptSchema>;

export type TutorAssignment = typeof tutorAssignments.$inferSelect;
export type InsertTutorAssignment = z.infer<typeof insertTutorAssignmentSchema>;

export type LevelProgressionRule = typeof levelProgressionRules.$inferSelect;
export type InsertLevelProgressionRule = z.infer<typeof insertLevelProgressionRuleSchema>;

export const insertTutorGoogleTokenSchema = createInsertSchema(tutorGoogleTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TutorGoogleToken = typeof tutorGoogleTokens.$inferSelect;
export type InsertTutorGoogleToken = z.infer<typeof insertTutorGoogleTokenSchema>;

export type LoginData = z.infer<typeof loginSchema>;
