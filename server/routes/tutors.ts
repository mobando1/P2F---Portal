import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { TutorManagementService } from "../services/tutor-management";
import { emailService } from "../services/email";
import { requireAuth, requireAdmin } from "./auth";

const tutorManagement = new TutorManagementService();

export function registerTutorRoutes(app: Express) {
  // Get tutors (with optional category filters)
  app.get("/api/tutors", async (req, res) => {
    try {
      const { search, minRating, classType, language } = req.query;
      // Admins see all tutors (including inactive)
      let isAdmin = false;
      if (req.session?.userId) {
        const reqUser = await storage.getUser(req.session.userId);
        if (reqUser?.userType === "admin") isAdmin = true;
      }
      const ct = (typeof classType === "string" && classType !== "all") ? classType : undefined;
      const lang = (typeof language === "string" && language !== "all") ? language : undefined;
      let result = (ct || lang)
        ? await storage.getTutorsByCategory(ct, lang)
        : await storage.getAllTutors(isAdmin);
      if (search && typeof search === "string") {
        const term = search.toLowerCase();
        result = result.filter(t =>
          t.name.toLowerCase().includes(term) ||
          t.specialization?.toLowerCase().includes(term) ||
          t.bio?.toLowerCase().includes(term)
        );
      }
      if (minRating && typeof minRating === "string") {
        const min = parseFloat(minRating);
        result = result.filter(t => parseFloat(t.rating || "0") >= min);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual tutor profile
  app.get("/api/tutors/:id", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      if (isNaN(tutorId)) {
        return res.status(400).json({ message: "Invalid tutor ID" });
      }
      const tutor = await storage.getTutor(tutorId);
      if (!tutor) {
        return res.status(404).json({ message: "Tutor not found" });
      }
      res.json(tutor);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a tutor (admin only) — auto-generates invite + sends email
  app.post("/api/tutors", requireAdmin, async (req, res) => {
    try {
      const tutorData = req.body;
      const tutor = await tutorManagement.createTutorProfile(tutorData);

      // Auto-generate invite link and send email
      if (!tutor.userId) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await storage.setTutorInviteToken(tutor.id, token, expiresAt);

        const BASE_URL = process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
          : "https://portal.passport2fluency.com";
        const inviteUrl = `${BASE_URL}/join?token=${token}`;

        emailService.sendTutorInvite({
          to: tutor.email,
          tutorName: tutor.name,
          inviteUrl,
          lang: "es",
        }).catch(err => console.error("[tutors] Failed to send invite email:", err));

        res.status(201).json({ ...tutor, inviteUrl: `/join?token=${token}` });
      } else {
        res.status(201).json(tutor);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update a tutor (admin only)
  app.put("/api/tutors/:id", requireAdmin, async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const updateData = req.body;
      const tutor = await tutorManagement.updateTutorProfile(tutorId, updateData);
      res.json(tutor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Generate invite link for a tutor (admin only)
  app.post("/api/tutors/:id/invite", requireAdmin, async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      if (isNaN(tutorId)) return res.status(400).json({ message: "Invalid tutor ID" });

      const tutor = await storage.getTutor(tutorId);
      if (!tutor) return res.status(404).json({ message: "Tutor not found" });

      if (tutor.userId) {
        return res.status(400).json({ message: "This tutor already has an active account." });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await storage.setTutorInviteToken(tutorId, token, expiresAt);

      const BASE_URL = process.env.APP_URL || (process.env.NODE_ENV === "production" ? "https://portal.passport2fluency.com" : "http://localhost:5000");
      const fullInviteUrl = `${BASE_URL}/join?token=${token}`;

      // Auto-send invite email
      if (tutor.email) {
        emailService.sendTutorInvite({
          to: tutor.email,
          tutorName: tutor.name,
          inviteUrl: fullInviteUrl,
          lang: "es",
        }).catch(err => console.error("[tutors] Failed to send invite email:", err));
      }

      res.json({ inviteUrl: `/join?token=${token}` });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Set tutor availability (admin only)
  app.post("/api/tutors/:id/availability", requireAdmin, async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const availability = req.body.availability;
      await tutorManagement.setTutorAvailability(tutorId, availability);
      res.json({ message: "Disponibilidad actualizada" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get tutor stats
  app.get("/api/tutors/:id/stats", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const stats = await tutorManagement.getTutorStats(tutorId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed/restore real tutors (admin only)
  app.post("/api/tutors/seed", requireAdmin, async (req, res) => {
    try {
      const { realTutors, defaultAvailability } = await import("../seed-tutors");
      const result = await tutorManagement.bulkImportTutors(realTutors);
      // Set availability for each tutor
      for (const tutor of result.success) {
        try {
          await tutorManagement.setTutorAvailability(tutor.id, defaultAvailability);
        } catch (e) {
          // Availability setup is non-critical
        }
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import tutors (admin only)
  app.post("/api/tutors/bulk-import", requireAdmin, async (req, res) => {
    try {
      const tutorsData = req.body.tutors;
      const result = await tutorManagement.bulkImportTutors(tutorsData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== Tutor Payments (Admin) =====

  // Get all payments
  app.get("/api/admin/tutor-payments", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllTutorPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending liquidation — how much is owed to each tutor
  app.get("/api/admin/tutor-payments/pending", requireAdmin, async (req, res) => {
    try {
      const allTutors = await storage.getAllTutors(true);
      const allPayments = await storage.getAllTutorPayments();

      const pending = await Promise.all(allTutors.filter(t => t.isActive).map(async (tutor) => {
        const tutorPaymentsList = allPayments.filter(p => p.tutorId === tutor.id && p.status === "paid");
        const lastPaidAt = tutorPaymentsList.length > 0
          ? new Date(Math.max(...tutorPaymentsList.map(p => new Date(p.periodEnd!).getTime())))
          : null;

        const allClasses = await storage.getClassesByTutor(tutor.id);
        const unpaidClasses = allClasses.filter(c => {
          if (c.status !== "completed") return false;
          if (lastPaidAt && new Date(c.scheduledAt) <= lastPaidAt) return false;
          return true;
        });

        const hours = unpaidClasses.reduce((sum, c) => sum + (c.duration || 60), 0) / 60;
        const rate = parseFloat(tutor.hourlyRate?.toString() || "25");
        const amount = Math.round(hours * rate * 100) / 100;

        return {
          tutorId: tutor.id,
          tutorName: tutor.name,
          tutorEmail: tutor.email,
          hourlyRate: rate,
          unpaidClasses: unpaidClasses.length,
          unpaidHours: Math.round(hours * 10) / 10,
          amountOwed: amount,
          periodStart: lastPaidAt || (unpaidClasses.length > 0 ? unpaidClasses[unpaidClasses.length - 1].scheduledAt : null),
          periodEnd: unpaidClasses.length > 0 ? unpaidClasses[0].scheduledAt : null,
        };
      }));

      res.json(pending.filter(p => p.unpaidClasses > 0));
    } catch (error) {
      console.error("[admin/tutor-payments/pending] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create payment
  app.post("/api/admin/tutor-payments", requireAdmin, async (req, res) => {
    try {
      const { tutorId, amount, currency, periodStart, periodEnd, classesCount, hoursWorked, paymentMethod, paymentReference, receiptUrl, notes, status } = req.body;

      if (!tutorId || !amount || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "tutorId, amount, periodStart, and periodEnd are required" });
      }

      const payment = await storage.createTutorPayment({
        tutorId,
        amount,
        currency: currency || "USD",
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        classesCount: classesCount || 0,
        hoursWorked: hoursWorked || "0",
        status: status || "paid",
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        paidAt: status === "paid" ? new Date() : null,
        createdBy: req.session.userId!,
      });

      res.status(201).json(payment);
    } catch (error) {
      console.error("[admin/tutor-payments] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update payment (e.g. add receipt, change status)
  app.put("/api/admin/tutor-payments/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payment ID" });

      const { status, paymentMethod, paymentReference, receiptUrl, notes } = req.body;
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (paymentReference !== undefined) updateData.paymentReference = paymentReference;
      if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
      if (notes !== undefined) updateData.notes = notes;
      if (status === "paid") updateData.paidAt = new Date();

      const payment = await storage.updateTutorPayment(id, updateData as any);
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
