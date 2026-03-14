import type { Express } from "express";
import Stripe from "stripe";
import { requireAdmin } from "./auth";
import { storage } from "../storage";
import { db } from "../db";
import { users, classes, classPurchases, subscriptions, tutors, userProgress, reviews, aiConversations, aiMessages, stripeEvents } from "@shared/schema";
import { eq, and, not, gte, lte, lt, sql, inArray, desc } from "drizzle-orm";
import { stripeCache, CACHE_TTL } from "../services/stripe-cache";

const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeKey ? new Stripe(stripeKey) : null;

export function registerAnalyticsRoutes(app: Express) {

  // =============================================
  // Main analytics endpoint with date filtering
  // =============================================
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      // Date filtering
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const fromDate = req.query.from ? new Date(req.query.from as string) : sixMonthsAgo;
      const toDate = req.query.to ? new Date(req.query.to as string) : now;

      // Fallback to storage-based approach if no DB
      if (!db) {
        const allClasses = await storage.getAllClasses();
        const allTutors = await storage.getAllTutors();
        const allUsers = await storage.getAllUsers();
        const students = allUsers.filter(u => u.userType !== "admin" && u.userType !== "tutor");
        const classesByStatus: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0 };
        allClasses.forEach(c => { classesByStatus[c.status] = (classesByStatus[c.status] || 0) + 1; });
        const totalHours = allClasses.filter(c => c.status === "completed").reduce((s, c) => s + (c.duration || 60), 0) / 60;
        return res.json({
          classesByCategory: {}, classesByStatus, classesByMonth: [], tutorActivity: [],
          studentActivity: { totalActive: 0, newThisMonth: 0, withCredits: 0, withoutCredits: students.length, totalStudents: students.length },
          capacityAlerts: [],
          summary: { totalClasses: allClasses.length, totalStudents: students.length, completionRate: 0, totalHours: +totalHours.toFixed(1) },
          revenue: { totalRevenue: 0, revenueByMonth: [], avgRevenuePerStudent: 0, trialConversionRate: 0, activeSubscriptions: 0, newSubscriptionsByMonth: [] },
          retention: { activeThisMonth: 0, activeLastMonth: 0, retentionRate: 0, churnedStudents: 0, avgClassesPerStudent: 0 },
        });
      }

      // ---- All queries use Drizzle directly ----

      // Classes by category (filtered by date)
      const catRows = await db.select({
        category: sql<string>`COALESCE(${classes.classCategory}, 'uncategorized')`,
        count: sql<number>`count(*)::int`,
      }).from(classes)
        .where(and(gte(classes.scheduledAt, fromDate), lte(classes.scheduledAt, toDate)))
        .groupBy(sql`COALESCE(${classes.classCategory}, 'uncategorized')`);

      const classesByCategory: Record<string, number> = {};
      catRows.forEach(r => { classesByCategory[r.category] = r.count; });

      // Classes by status
      const statusRows = await db.select({
        status: classes.status,
        count: sql<number>`count(*)::int`,
      }).from(classes)
        .where(and(gte(classes.scheduledAt, fromDate), lte(classes.scheduledAt, toDate)))
        .groupBy(classes.status);

      const classesByStatus: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0 };
      statusRows.forEach(r => { classesByStatus[r.status] = r.count; });
      const totalClasses = Object.values(classesByStatus).reduce((a, b) => a + b, 0);

      // Classes by month
      const monthRows = await db.select({
        month: sql<string>`to_char(${classes.scheduledAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      }).from(classes)
        .where(and(gte(classes.scheduledAt, fromDate), lte(classes.scheduledAt, toDate)))
        .groupBy(sql`to_char(${classes.scheduledAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${classes.scheduledAt}, 'YYYY-MM')`);

      // Total hours
      const hoursResult = await db.select({
        totalMinutes: sql<number>`COALESCE(SUM(${classes.duration}), 0)::int`,
      }).from(classes)
        .where(and(
          eq(classes.status, "completed"),
          gte(classes.scheduledAt, fromDate),
          lte(classes.scheduledAt, toDate),
        ));
      const totalHours = +(((hoursResult[0]?.totalMinutes || 0) / 60).toFixed(1));

      // Students
      const studentRows = await db.select({
        total: sql<number>`count(*)::int`,
        withCredits: sql<number>`count(*) FILTER (WHERE ${users.classCredits} > 0)::int`,
        newThisMonth: sql<number>`count(*) FILTER (WHERE ${users.createdAt} >= ${new Date(now.getFullYear(), now.getMonth(), 1)})::int`,
      }).from(users)
        .where(and(
          not(eq(users.userType, "admin")),
          not(eq(users.userType, "tutor")),
        ));

      const totalStudents = studentRows[0]?.total || 0;
      const withCredits = studentRows[0]?.withCredits || 0;
      const newThisMonth = studentRows[0]?.newThisMonth || 0;

      // Active students (have at least 1 class in date range)
      const activeResult = await db.select({
        count: sql<number>`count(DISTINCT ${classes.userId})::int`,
      }).from(classes)
        .where(and(gte(classes.scheduledAt, fromDate), lte(classes.scheduledAt, toDate)));
      const totalActive = activeResult[0]?.count || 0;

      // Tutor activity
      const allTutors = await storage.getAllTutors();
      const tutorActivityRows = await db.select({
        tutorId: classes.tutorId,
        scheduled: sql<number>`count(*) FILTER (WHERE ${classes.status} = 'scheduled')::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${classes.status} = 'completed')::int`,
        total: sql<number>`count(*)::int`,
      }).from(classes)
        .where(and(gte(classes.scheduledAt, fromDate), lte(classes.scheduledAt, toDate)))
        .groupBy(classes.tutorId);

      const tutorActivityMap = new Map(tutorActivityRows.map(r => [r.tutorId, r]));
      const tutorActivity = allTutors.map(t => {
        const data = tutorActivityMap.get(t.id);
        const scheduled = data?.scheduled || 0;
        const completed = data?.completed || 0;
        const total = scheduled + completed;
        return {
          tutorId: t.id, tutorName: t.name,
          scheduledCount: scheduled, completedCount: completed, totalClasses: total,
          utilization: total > 0 ? +(completed / total).toFixed(2) : 0,
        };
      });

      // Capacity alerts
      const capacityAlerts: Array<{ type: string; message: string }> = [];
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekCapacity = await db.select({
        tutorId: classes.tutorId,
        count: sql<number>`count(*)::int`,
      }).from(classes)
        .where(and(
          eq(classes.status, "scheduled"),
          gte(classes.scheduledAt, weekStart),
          lt(classes.scheduledAt, weekEnd),
        ))
        .groupBy(classes.tutorId);

      weekCapacity.forEach(row => {
        if (row.count >= 15) {
          const tutor = allTutors.find(t => t.id === row.tutorId);
          if (tutor) {
            capacityAlerts.push({ type: "high_demand", message: `${tutor.name} tiene ${row.count} clases esta semana` });
          }
        }
      });

      const categories = ["adults-spanish", "kids-spanish", "adults-english", "kids-english"];
      categories.forEach(cat => {
        const [classType, lang] = cat.split("-");
        const catTutors = allTutors.filter(t => t.classType === classType && t.languageTaught === lang);
        if (catTutors.length <= 1) {
          const label = `${classType === "kids" ? "Kids" : "Adults"} ${lang === "spanish" ? "Spanish" : "English"}`;
          capacityAlerts.push({ type: "low_tutors", message: `Solo ${catTutors.length} tutor(es) para ${label}` });
        }
      });

      // ---- REVENUE ----
      const revenueByMonth = await db.select({
        month: sql<string>`to_char(${classPurchases.createdAt}, 'YYYY-MM')`,
        amount: sql<number>`COALESCE(SUM(${classPurchases.amount}::numeric), 0)`,
      }).from(classPurchases)
        .where(and(
          eq(classPurchases.status, "completed"),
          gte(classPurchases.createdAt, fromDate),
          lte(classPurchases.createdAt, toDate),
        ))
        .groupBy(sql`to_char(${classPurchases.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${classPurchases.createdAt}, 'YYYY-MM')`);

      const totalRevenue = revenueByMonth.reduce((sum, r) => sum + Number(r.amount), 0);

      const activeSubsResult = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(subscriptions)
        .where(eq(subscriptions.status, "active"));
      const activeSubscriptions = activeSubsResult[0]?.count || 0;

      const newSubsByMonth = await db.select({
        month: sql<string>`to_char(${subscriptions.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      }).from(subscriptions)
        .where(and(
          gte(subscriptions.createdAt, fromDate),
          lte(subscriptions.createdAt, toDate),
        ))
        .groupBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM')`);

      // Trial conversion
      const trialResult = await db.select({
        totalTrials: sql<number>`count(*) FILTER (WHERE ${users.trialCompleted} = true)::int`,
        converted: sql<number>`count(*) FILTER (WHERE ${users.trialCompleted} = true AND ${users.userType} = 'customer')::int`,
      }).from(users);
      const trialConversionRate = (trialResult[0]?.totalTrials || 0) > 0
        ? +((trialResult[0].converted / trialResult[0].totalTrials) * 100).toFixed(1) : 0;

      // ---- RETENTION ----
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = thisMonthStart;

      const activeThisMonthRows = await db.selectDistinct({ userId: classes.userId })
        .from(classes)
        .where(and(
          gte(classes.scheduledAt, thisMonthStart),
          lt(classes.scheduledAt, thisMonthEnd),
          not(eq(classes.status, "cancelled")),
        ));

      const activeLastMonthRows = await db.selectDistinct({ userId: classes.userId })
        .from(classes)
        .where(and(
          gte(classes.scheduledAt, lastMonthStart),
          lt(classes.scheduledAt, lastMonthEnd),
          not(eq(classes.status, "cancelled")),
        ));

      const thisMonthSet = new Set(activeThisMonthRows.map(r => r.userId));
      const lastMonthSet = new Set(activeLastMonthRows.map(r => r.userId));
      const retained = Array.from(lastMonthSet).filter(id => thisMonthSet.has(id)).length;
      const retentionRate = lastMonthSet.size > 0 ? +((retained / lastMonthSet.size) * 100).toFixed(1) : 0;

      // Avg classes per student
      const avgResult = await db.select({
        avg: sql<number>`COALESCE(AVG(class_count), 0)`,
      }).from(
        db.select({
          userId: classes.userId,
          class_count: sql<number>`count(*)::int`.as("class_count"),
        }).from(classes)
          .where(and(
            gte(classes.scheduledAt, fromDate),
            lte(classes.scheduledAt, toDate),
            not(eq(classes.status, "cancelled")),
          ))
          .groupBy(classes.userId)
          .as("student_classes")
      );

      res.json({
        classesByCategory,
        classesByStatus,
        classesByMonth: monthRows,
        tutorActivity,
        studentActivity: {
          totalActive,
          newThisMonth,
          withCredits,
          withoutCredits: totalStudents - withCredits,
          totalStudents,
        },
        capacityAlerts,
        summary: {
          totalClasses,
          totalStudents,
          completionRate: totalClasses > 0 ? +((classesByStatus.completed / totalClasses) * 100).toFixed(1) : 0,
          totalHours,
        },
        revenue: {
          totalRevenue: +totalRevenue.toFixed(2),
          revenueByMonth: revenueByMonth.map(r => ({ month: r.month, amount: +Number(r.amount).toFixed(2) })),
          avgRevenuePerStudent: totalStudents > 0 ? +(totalRevenue / totalStudents).toFixed(2) : 0,
          trialConversionRate,
          activeSubscriptions,
          newSubscriptionsByMonth: newSubsByMonth,
        },
        retention: {
          activeThisMonth: thisMonthSet.size,
          activeLastMonth: lastMonthSet.size,
          retentionRate,
          churnedStudents: lastMonthSet.size - retained,
          avgClassesPerStudent: +(Number(avgResult[0]?.avg || 0).toFixed(1)),
        },
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================
  // Student list with metrics
  // =============================================
  app.get("/api/admin/analytics/students", requireAdmin, async (_req, res) => {
    try {
      if (!db) return res.json({ students: [], total: 0 });

      const rows = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        userType: users.userType,
        classCredits: users.classCredits,
        createdAt: users.createdAt,
        lastActivityAt: users.lastActivityAt,
      }).from(users)
        .where(and(
          not(eq(users.userType, "admin")),
          not(eq(users.userType, "tutor")),
        ))
        .orderBy(desc(users.createdAt));

      // Get class counts per student
      const classCountRows = await db.select({
        userId: classes.userId,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${classes.status} = 'completed')::int`,
        lastClass: sql<string>`MAX(${classes.scheduledAt})`,
      }).from(classes).groupBy(classes.userId);
      const classMap = new Map(classCountRows.map(r => [r.userId, r]));

      // Get spending per student
      const spendRows = await db.select({
        userId: classPurchases.userId,
        total: sql<number>`COALESCE(SUM(${classPurchases.amount}::numeric), 0)`,
      }).from(classPurchases)
        .where(eq(classPurchases.status, "completed"))
        .groupBy(classPurchases.userId);
      const spendMap = new Map(spendRows.map(r => [r.userId, +Number(r.total).toFixed(2)]));

      // Get active subscriptions
      const subRows = await db.select({
        userId: subscriptions.userId,
      }).from(subscriptions)
        .where(eq(subscriptions.status, "active"));
      const subSet = new Set(subRows.map(r => r.userId));

      const students = rows.map(u => {
        const cls = classMap.get(u.id);
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          userType: u.userType,
          classCredits: u.classCredits || 0,
          totalClasses: cls?.total || 0,
          completedClasses: cls?.completed || 0,
          totalSpent: spendMap.get(u.id) || 0,
          lastClassDate: cls?.lastClass || null,
          createdAt: u.createdAt,
          lastActivityAt: u.lastActivityAt,
          hasSubscription: subSet.has(u.id),
        };
      });

      res.json({ students, total: students.length });
    } catch (error) {
      console.error("Error fetching student analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================
  // Per-student detail
  // =============================================
  app.get("/api/admin/analytics/student/:studentId", requireAdmin, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (!db) return res.status(400).json({ message: "Database not available" });

      // User info
      const user = await storage.getUser(studentId);
      if (!user) return res.status(404).json({ message: "Student not found" });

      // Classes
      const studentClasses = await db.select({
        id: classes.id,
        title: classes.title,
        scheduledAt: classes.scheduledAt,
        status: classes.status,
        duration: classes.duration,
        isTrial: classes.isTrial,
        classCategory: classes.classCategory,
        tutorId: classes.tutorId,
        tutorName: tutors.name,
      }).from(classes)
        .leftJoin(tutors, eq(classes.tutorId, tutors.id))
        .where(eq(classes.userId, studentId))
        .orderBy(desc(classes.scheduledAt));

      const totalClassesCount = studentClasses.length;
      const completedCount = studentClasses.filter(c => c.status === "completed").length;
      const cancelledCount = studentClasses.filter(c => c.status === "cancelled").length;
      const upcomingCount = studentClasses.filter(c => c.status === "scheduled").length;

      // Classes by month
      const classesByMonth: Record<string, number> = {};
      studentClasses.forEach(c => {
        const month = new Date(c.scheduledAt).toISOString().slice(0, 7);
        classesByMonth[month] = (classesByMonth[month] || 0) + 1;
      });
      const classesByMonthArr = Object.entries(classesByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Financial
      const purchases = await db.select().from(classPurchases)
        .where(eq(classPurchases.userId, studentId))
        .orderBy(desc(classPurchases.createdAt));
      const totalSpent = purchases
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const studentSub = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, studentId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      // Progress
      const progressRows = await db.select().from(userProgress)
        .where(eq(userProgress.userId, studentId))
        .limit(1);

      // AI usage
      const aiConvResult = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(aiConversations)
        .where(eq(aiConversations.userId, studentId));

      const aiMsgResult = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(aiMessages)
        .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
        .where(eq(aiConversations.userId, studentId));

      // Reviews
      const studentReviews = await db.select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        tutorId: reviews.tutorId,
        tutorName: tutors.name,
        createdAt: reviews.createdAt,
      }).from(reviews)
        .leftJoin(tutors, eq(reviews.tutorId, tutors.id))
        .where(eq(reviews.userId, studentId))
        .orderBy(desc(reviews.createdAt));

      // Engagement
      const lastClassDate = studentClasses.length > 0 ? new Date(studentClasses[0].scheduledAt) : null;
      const daysSinceLastClass = lastClassDate ? Math.floor((Date.now() - lastClassDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const daysSinceSignup = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const monthsSinceSignup = Math.max(daysSinceSignup / 30, 1);
      const avgClassesPerMonth = +(totalClassesCount / monthsSinceSignup).toFixed(1);

      // Preferred tutor and category
      const tutorCounts: Record<number, { name: string; count: number }> = {};
      const categoryCounts: Record<string, number> = {};
      studentClasses.forEach(c => {
        if (c.tutorId && c.tutorName) {
          if (!tutorCounts[c.tutorId]) tutorCounts[c.tutorId] = { name: c.tutorName, count: 0 };
          tutorCounts[c.tutorId].count++;
        }
        if (c.classCategory) {
          categoryCounts[c.classCategory] = (categoryCounts[c.classCategory] || 0) + 1;
        }
      });

      const preferredTutor = Object.entries(tutorCounts).sort((a, b) => b[1].count - a[1].count)[0];
      const preferredCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

      res.json({
        user: {
          id: user.id, firstName: user.firstName, lastName: user.lastName,
          email: user.email, userType: user.userType, classCredits: user.classCredits,
          trialCompleted: user.trialCompleted, createdAt: user.createdAt,
          lastActivityAt: user.lastActivityAt, aiSubscriptionActive: user.aiSubscriptionActive,
          level: user.level,
        },
        classes: {
          total: totalClassesCount, completed: completedCount,
          cancelled: cancelledCount, upcoming: upcomingCount,
          byMonth: classesByMonthArr,
          recent: studentClasses.slice(0, 10).map(c => ({
            id: c.id, title: c.title, scheduledAt: c.scheduledAt,
            status: c.status, tutorName: c.tutorName, classCategory: c.classCategory,
          })),
        },
        financial: {
          totalSpent: +totalSpent.toFixed(2),
          purchases: purchases.map(p => ({
            id: p.id, classesAdded: p.classesAdded, amount: p.amount,
            status: p.status, createdAt: p.createdAt,
          })),
          subscription: studentSub[0] || null,
          creditsRemaining: user.classCredits || 0,
        },
        progress: progressRows[0] || null,
        aiUsage: {
          conversations: aiConvResult[0]?.count || 0,
          messages: aiMsgResult[0]?.count || 0,
        },
        engagement: {
          daysSinceLastClass,
          daysSinceSignup,
          avgClassesPerMonth,
          preferredCategory: preferredCategory ? preferredCategory[0] : null,
          preferredTutor: preferredTutor ? { id: Number(preferredTutor[0]), name: preferredTutor[1].name } : null,
        },
        reviews: studentReviews,
      });
    } catch (error) {
      console.error("Error fetching student detail:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================
  // Stripe Metrics (MRR, Churn, Failed Payments)
  // =============================================
  app.get("/api/admin/analytics/stripe-metrics", requireAdmin, async (_req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe not configured" });

      const cached = stripeCache.get("stripe-metrics");
      if (cached) return res.json(cached);

      // MRR from active subscriptions
      let mrr = 0;
      const mrrTrend: Array<{ month: string; mrr: number }> = [];
      try {
        const activeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        for (const sub of activeSubs.data) {
          mrr += (sub.items.data[0]?.price?.unit_amount || 0);
        }
      } catch (e) {
        console.error("Error fetching Stripe subscriptions:", e);
      }

      // Churn from local stripeEvents
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      let churnCount = 0;
      let failedPayments = 0;
      const atRiskSubscribers: Array<{ userId: number; name: string; email: string; lastFailedAt: string }> = [];

      if (db) {
        const cancelledRows = await db.select({ count: sql<number>`count(*)::int` })
          .from(stripeEvents)
          .where(and(
            eq(stripeEvents.eventType, "subscription_cancelled"),
            gte(stripeEvents.createdAt, monthStart),
          ));
        churnCount = cancelledRows[0]?.count || 0;

        const failedRows = await db.select({ count: sql<number>`count(*)::int` })
          .from(stripeEvents)
          .where(and(
            eq(stripeEvents.eventType, "payment_failed"),
            gte(stripeEvents.createdAt, monthStart),
          ));
        failedPayments = failedRows[0]?.count || 0;

        // At-risk subscribers (recent failed payments)
        const failedEvents = await db.select({
          userId: stripeEvents.userId,
          createdAt: stripeEvents.createdAt,
        }).from(stripeEvents)
          .where(and(
            eq(stripeEvents.eventType, "payment_failed"),
            gte(stripeEvents.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
          ))
          .orderBy(desc(stripeEvents.createdAt))
          .limit(10);

        for (const event of failedEvents) {
          if (event.userId) {
            const user = await storage.getUser(event.userId);
            if (user) {
              atRiskSubscribers.push({
                userId: user.id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                lastFailedAt: event.createdAt?.toISOString() || "",
              });
            }
          }
        }

        // MRR trend (last 6 months from classPurchases + subscriptions)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const revenueByMonth = await db.select({
          month: sql<string>`to_char(${classPurchases.createdAt}, 'YYYY-MM')`,
          amount: sql<number>`COALESCE(SUM(${classPurchases.amount}::numeric), 0)`,
        }).from(classPurchases)
          .where(and(
            eq(classPurchases.status, "completed"),
            gte(classPurchases.createdAt, sixMonthsAgo),
          ))
          .groupBy(sql`to_char(${classPurchases.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${classPurchases.createdAt}, 'YYYY-MM')`);

        revenueByMonth.forEach(r => {
          mrrTrend.push({ month: r.month, mrr: +Number(r.amount).toFixed(2) });
        });
      }

      // Active subs at month start for churn rate calc
      let activeAtStart = 0;
      if (db) {
        const activeStartRows = await db.select({ count: sql<number>`count(*)::int` })
          .from(subscriptions)
          .where(and(
            eq(subscriptions.status, "active"),
          ));
        activeAtStart = (activeStartRows[0]?.count || 0) + churnCount;
      }

      const churnRate = activeAtStart > 0 ? +((churnCount / activeAtStart) * 100).toFixed(1) : 0;

      const result = {
        mrr: mrr / 100, // convert from cents
        mrrTrend,
        churnRate,
        churnCount,
        failedPayments,
        atRiskSubscribers,
      };

      stripeCache.set("stripe-metrics", result, CACHE_TTL.MRR);
      res.json(result);
    } catch (error) {
      console.error("Error fetching stripe metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================
  // Transaction History from Stripe
  // =============================================
  app.get("/api/admin/analytics/transactions", requireAdmin, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe not configured" });

      const limit = parseInt(req.query.limit as string) || 25;
      const startingAfter = req.query.starting_after as string | undefined;

      const cacheKey = `transactions:${limit}:${startingAfter || "start"}`;
      const cached = stripeCache.get(cacheKey);
      if (cached) return res.json(cached);

      const params: Stripe.ChargeListParams = { limit };
      if (startingAfter) params.starting_after = startingAfter;

      const charges = await stripe.charges.list(params);

      const data = charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        refunded: charge.refunded,
        amountRefunded: charge.amount_refunded / 100,
        customerEmail: charge.billing_details?.email || charge.receipt_email || "",
        description: charge.description || "",
        created: new Date(charge.created * 1000).toISOString(),
        paymentMethodType: charge.payment_method_details?.type || "card",
        cardBrand: charge.payment_method_details?.card?.brand || null,
        cardLast4: charge.payment_method_details?.card?.last4 || null,
        receiptUrl: charge.receipt_url || null,
        paymentIntentId: charge.payment_intent as string | null,
      }));

      const result = {
        data,
        hasMore: charges.has_more,
        nextCursor: charges.has_more ? charges.data[charges.data.length - 1]?.id : null,
      };

      stripeCache.set(cacheKey, result, CACHE_TTL.TRANSACTIONS);
      res.json(result);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================
  // Process Refund from Admin
  // =============================================
  app.post("/api/admin/analytics/refund", requireAdmin, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe not configured" });

      const { paymentIntentId, amount } = req.body;
      if (!paymentIntentId) return res.status(400).json({ message: "paymentIntentId required" });

      const refundParams: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
      if (amount) refundParams.amount = Math.round(amount * 100); // convert to cents

      const refund = await stripe.refunds.create(refundParams);

      // Update local DB if we have the purchase
      if (db) {
        const purchase = await storage.getClassPurchaseByPaymentIntent(paymentIntentId);
        if (purchase) {
          await storage.updateClassPurchase(purchase.id, {
            status: "refunded",
            refundedAt: new Date(),
            refundId: refund.id,
          });
          // Deduct credits
          const user = await storage.getUser(purchase.userId);
          if (user) {
            const newCredits = Math.max(0, (user.classCredits || 0) - purchase.classesAdded);
            await storage.updateUser(user.id, { classCredits: newCredits });
          }
        }
      }

      stripeCache.invalidatePrefix("transactions");
      stripeCache.invalidatePrefix("stripe-metrics");
      stripeCache.invalidatePrefix("student-stripe");

      res.json({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          currency: refund.currency,
        },
      });
    } catch (error: any) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: error.message || "Refund failed" });
    }
  });

  // =============================================
  // Per-student Stripe data (LTV, payment methods, transactions)
  // =============================================
  app.get("/api/admin/analytics/student/:studentId/stripe", requireAdmin, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe not configured" });

      const studentId = parseInt(req.params.studentId);
      const user = await storage.getUser(studentId);
      if (!user) return res.status(404).json({ message: "Student not found" });

      const cacheKey = `student-stripe:${studentId}`;
      const cached = stripeCache.get(cacheKey);
      if (cached) return res.json(cached);

      // Find Stripe customer by email
      let stripeCustomerId: string | null = null;
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      } catch (e) {
        console.error("Error finding Stripe customer:", e);
      }

      let ltv = 0;
      let paymentMethods: Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number }> = [];
      let transactions: Array<{ id: string; amount: number; status: string; refunded: boolean; created: string; description: string; paymentIntentId: string | null }> = [];

      if (stripeCustomerId) {
        // LTV: sum all successful charges
        try {
          const charges = await stripe.charges.list({ customer: stripeCustomerId, limit: 100 });
          for (const charge of charges.data) {
            if (charge.status === "succeeded" && !charge.refunded) {
              ltv += charge.amount;
            }
          }
          transactions = charges.data.map(c => ({
            id: c.id,
            amount: c.amount / 100,
            status: c.status,
            refunded: c.refunded,
            created: new Date(c.created * 1000).toISOString(),
            description: c.description || "",
            paymentIntentId: c.payment_intent as string | null,
          }));
        } catch (e) {
          console.error("Error fetching customer charges:", e);
        }

        // Payment methods
        try {
          const methods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: "card",
          });
          paymentMethods = methods.data.map(m => ({
            id: m.id,
            brand: m.card?.brand || "unknown",
            last4: m.card?.last4 || "****",
            expMonth: m.card?.exp_month || 0,
            expYear: m.card?.exp_year || 0,
          }));
        } catch (e) {
          console.error("Error fetching payment methods:", e);
        }
      }

      const result = {
        ltv: ltv / 100,
        stripeCustomerId,
        paymentMethods,
        transactions,
      };

      stripeCache.set(cacheKey, result, CACHE_TTL.STUDENT_STRIPE);
      res.json(result);
    } catch (error) {
      console.error("Error fetching student stripe data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
