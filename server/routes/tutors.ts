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
}
