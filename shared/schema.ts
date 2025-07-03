import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  level: text("level").notNull().default("A1"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planName: text("plan_name").notNull(),
  planType: text("plan_type").notNull(), // 'basic', 'premium', 'unlimited'
  classesLimit: integer("classes_limit"),
  classesUsed: integer("classes_used").default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tutors = pgTable("tutors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  specialization: text("specialization").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  reviewCount: integer("review_count").default(0),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  // Información adicional para profesores
  phone: text("phone"),
  country: text("country"),
  timezone: text("timezone"),
  certifications: text("certifications").array(),
  yearsOfExperience: integer("years_of_experience"),
  // Integración con High Level
  highLevelContactId: text("high_level_contact_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nueva tabla para disponibilidad de tutores
export const tutorAvailability = pgTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Domingo, 1=Lunes, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabla para configuración de High Level
export const highLevelConfig = pgTable("high_level_config", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull(),
  locationId: text("location_id").notNull(),
  webhookUrl: text("webhook_url"),
  // Plantillas de mensajes
  classBookingTemplateId: text("class_booking_template_id"),
  classReminderTemplateId: text("class_reminder_template_id"),
  classCancellationTemplateId: text("class_cancellation_template_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  classesCompleted: integer("classes_completed").default(0),
  learningHours: decimal("learning_hours", { precision: 10, scale: 2 }).default("0.00"),
  currentStreak: integer("current_streak").default(0),
  totalVideosWatched: integer("total_videos_watched").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
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

export const insertHighLevelConfigSchema = createInsertSchema(highLevelConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;
export type HighLevelConfig = typeof highLevelConfig.$inferSelect;
export type InsertHighLevelConfig = z.infer<typeof insertHighLevelConfigSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type LoginData = z.infer<typeof loginSchema>;
