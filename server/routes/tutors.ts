import type { Express } from "express";
import { storage } from "../storage";
import { TutorManagementService } from "../services/tutor-management";
import { requireAuth, requireAdmin } from "./auth";

const tutorManagement = new TutorManagementService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

export function registerTutorRoutes(app: Express) {
  // Get tutors (with optional category filters)
  app.get("/api/tutors", async (req, res) => {
    try {
      const { classType, language, search, minRating } = req.query;
      let result = await storage.getTutorsByCategory(
        classType as string | undefined,
        language as string | undefined
      );
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

  // Create a tutor (admin only)
  app.post("/api/tutors", requireAdmin, async (req, res) => {
    try {
      const tutorData = req.body;
      const tutor = await tutorManagement.createTutorProfile(tutorData);
      res.status(201).json(tutor);
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
