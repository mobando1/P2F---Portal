import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "./auth";
import { gamificationService } from "../services/gamification";
import { z } from "zod";

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  classId: z.number().int().optional(),
});

export function registerReviewRoutes(app: Express) {
  // Get reviews for a tutor
  app.get("/api/tutors/:id/reviews", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      if (isNaN(tutorId)) {
        return res.status(400).json({ message: "Invalid tutor ID" });
      }

      const reviews = await storage.getReviewsByTutor(tutorId);

      // Batch-fetch unique users to avoid N+1
      const uniqueUserIds = Array.from(new Set(reviews.map(r => r.userId)));
      const userMap = new Map<number, { name: string; avatar: string | null }>();
      for (const uid of uniqueUserIds) {
        const user = await storage.getUser(uid);
        if (user) {
          userMap.set(uid, {
            name: `${user.firstName} ${user.lastName.charAt(0)}.`,
            avatar: user.avatar || null,
          });
        }
      }

      const enriched = reviews.map(review => {
        const userData = userMap.get(review.userId);
        return {
          ...review,
          userName: userData?.name || "Anonymous",
          userAvatar: userData?.avatar || null,
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a review for a tutor (authenticated)
  app.post("/api/tutors/:id/reviews", requireAuth, async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const userId = req.session.userId!;

      if (isNaN(tutorId)) {
        return res.status(400).json({ message: "Invalid tutor ID" });
      }

      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid review data", errors: parsed.error.errors });
      }

      // Check if user already reviewed this tutor
      const existing = await storage.getUserReviewForTutor(userId, tutorId);
      if (existing) {
        return res.status(400).json({ message: "You have already reviewed this tutor" });
      }

      const review = await storage.createReview({
        userId,
        tutorId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        classId: parsed.data.classId,
      });

      // Update tutor's average rating and review count
      const allReviews = await storage.getReviewsByTutor(tutorId);
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await storage.updateTutor(tutorId, {
        rating: avgRating.toFixed(2),
        reviewCount: allReviews.length,
      });

      // Check gamification for first review
      gamificationService.onReviewGiven(userId);

      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
