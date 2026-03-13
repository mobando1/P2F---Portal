import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth";
import { evaluateSegment, countSegment, type SegmentFilters } from "../services/segment-engine";
import { getAvailableMergeTags, getMergeDataForUser, renderTemplate } from "../services/merge-tag-engine";
import { sendCampaign } from "../services/campaign-sender";

export function registerCampaignRoutes(app: Express) {
  // ===== Email Templates =====
  app.get("/api/admin/campaigns/templates", requireAdmin, async (_req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/templates", requireAdmin, async (req, res) => {
    try {
      const { name, subject, body, channel, category, language } = req.body;
      if (!name || !subject || !body) {
        return res.status(400).json({ message: "Name, subject, and body are required" });
      }
      const template = await storage.createEmailTemplate({
        name, subject, body,
        channel: channel || "email",
        category: category || "marketing",
        language: language || "es",
        createdBy: (req as any).session?.userId || null,
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/campaigns/templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(parseInt(req.params.id));
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(parseInt(req.params.id), req.body);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/templates/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteEmailTemplate(parseInt(req.params.id));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/templates/:id/preview", requireAdmin, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(parseInt(req.params.id));
      if (!template) return res.status(404).json({ message: "Template not found" });

      // Use a sample user or specified userId for preview
      const userId = req.body.userId;
      const offer = req.body.offer;
      const mergeData = userId
        ? await getMergeDataForUser(userId, offer)
        : {
            firstName: "Maria", lastName: "Garcia", email: "maria@example.com",
            level: "A2", classCredits: 3, userType: "customer", trialStatus: "Completed",
            classesCompleted: 5, currentStreak: 3, learningHours: "10.5",
            offerCode: offer?.code || "SAMPLE15", offerDiscount: offer?.discountValue || "15%",
            offerExpiry: offer?.validUntil || "2026-04-01",
            packagesUrl: `${process.env.APP_URL || "https://passport2fluency.com"}/packages`,
            portalUrl: `${process.env.APP_URL || "https://passport2fluency.com"}/dashboard`,
            tutorName: "Carlos Martinez",
          };

      res.json({
        subject: renderTemplate(template.subject, mergeData),
        body: renderTemplate(template.body, mergeData),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Merge Tags Reference =====
  app.get("/api/admin/campaigns/merge-tags", requireAdmin, async (_req, res) => {
    try {
      res.json(getAvailableMergeTags());
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Audience Segments =====
  app.get("/api/admin/campaigns/segments", requireAdmin, async (_req, res) => {
    try {
      const segments = await storage.getAudienceSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/segments", requireAdmin, async (req, res) => {
    try {
      const { name, description, filters } = req.body;
      if (!name || !filters) {
        return res.status(400).json({ message: "Name and filters are required" });
      }
      const segment = await storage.createAudienceSegment({
        name, description, filters,
        createdBy: (req as any).session?.userId || null,
      });
      res.json(segment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/segments/:id", requireAdmin, async (req, res) => {
    try {
      const segment = await storage.updateAudienceSegment(parseInt(req.params.id), req.body);
      if (!segment) return res.status(404).json({ message: "Segment not found" });
      res.json(segment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/segments/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteAudienceSegment(parseInt(req.params.id));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Preview segment: count matching users
  app.post("/api/admin/campaigns/segments/:id/preview", requireAdmin, async (req, res) => {
    try {
      const segment = await storage.getAudienceSegment(parseInt(req.params.id));
      if (!segment) return res.status(404).json({ message: "Segment not found" });
      const filters = segment.filters as SegmentFilters;
      const count = await countSegment(filters);
      const users = await evaluateSegment(filters);
      const sample = users.slice(0, 10).map(u => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName,
        email: u.email, userType: u.userType, level: u.level,
      }));
      res.json({ count, sample });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Ad-hoc preview (no saved segment)
  app.post("/api/admin/campaigns/segments/preview", requireAdmin, async (req, res) => {
    try {
      const { filters } = req.body;
      if (!filters) return res.status(400).json({ message: "Filters are required" });
      const count = await countSegment(filters as SegmentFilters);
      const users = await evaluateSegment(filters as SegmentFilters);
      const sample = users.slice(0, 10).map(u => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName,
        email: u.email, userType: u.userType, level: u.level,
      }));
      res.json({ count, sample });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Campaigns =====
  app.get("/api/admin/campaigns", requireAdmin, async (_req, res) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      res.json(allCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns", requireAdmin, async (req, res) => {
    try {
      const { name, templateId, segmentId, channel, offerId, scheduledAt } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const campaign = await storage.createCampaign({
        name, templateId, segmentId, offerId,
        channel: channel || "email",
        status: "draft",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        createdBy: (req as any).session?.userId || null,
      });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      const recipients = await storage.getCampaignRecipients(campaign.id);
      res.json({ ...campaign, recipients });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(parseInt(req.params.id), req.body);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCampaign(parseInt(req.params.id));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send campaign now
  app.post("/api/admin/campaigns/:id/send", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (campaign.status !== "draft" && campaign.status !== "scheduled") {
        return res.status(400).json({ message: "Campaign cannot be sent in its current status" });
      }
      // Send asynchronously but respond immediately
      const result = await sendCampaign(campaign.id);
      res.json({ message: "Campaign sent", ...result });
    } catch (error) {
      console.error("Error sending campaign:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Schedule campaign
  app.post("/api/admin/campaigns/:id/schedule", requireAdmin, async (req, res) => {
    try {
      const { scheduledAt } = req.body;
      if (!scheduledAt) return res.status(400).json({ message: "scheduledAt is required" });
      const campaign = await storage.updateCampaign(parseInt(req.params.id), {
        status: "scheduled",
        scheduledAt: new Date(scheduledAt),
      });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel scheduled campaign
  app.post("/api/admin/campaigns/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(parseInt(req.params.id), {
        status: "cancelled",
      });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Offers =====
  app.get("/api/admin/campaigns/offers", requireAdmin, async (_req, res) => {
    try {
      const allOffers = await storage.getOffers();
      res.json(allOffers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/offers", requireAdmin, async (req, res) => {
    try {
      const { name, code, discountType, discountValue, applicableTo, maxUses, validFrom, validUntil } = req.body;
      if (!name || !code || !discountType || !discountValue || !validFrom || !validUntil) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const offer = await storage.createOffer({
        name, code: code.toUpperCase(), discountType, discountValue,
        applicableTo: applicableTo || "all",
        maxUses: maxUses || null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: true,
        createdBy: (req as any).session?.userId || null,
      });
      res.json(offer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/offers/:id", requireAdmin, async (req, res) => {
    try {
      const offer = await storage.updateOffer(parseInt(req.params.id), req.body);
      if (!offer) return res.status(404).json({ message: "Offer not found" });
      res.json(offer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/offers/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteOffer(parseInt(req.params.id));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Communication Log (per student) =====
  app.get("/api/admin/crm/:userId/communications", requireAdmin, async (req, res) => {
    try {
      const log = await storage.getCommunicationLog(parseInt(req.params.userId));
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Quick send individual email from student detail
  app.post("/api/admin/crm/:userId/quick-send", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { templateId, subject, body, offerId } = req.body;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      let finalSubject = subject;
      let finalBody = body;

      // If templateId provided, load and render template
      if (templateId) {
        const template = await storage.getEmailTemplate(templateId);
        if (template) {
          let offer = undefined;
          if (offerId) {
            const offerData = await storage.getOffer(offerId);
            if (offerData) {
              offer = { code: offerData.code, discountType: offerData.discountType, discountValue: offerData.discountValue, validUntil: offerData.validUntil };
            }
          }
          const mergeData = await getMergeDataForUser(userId, offer);
          finalSubject = renderTemplate(template.subject, mergeData);
          finalBody = renderTemplate(template.body, mergeData);
        }
      } else {
        // Render merge tags in manual subject/body
        const mergeData = await getMergeDataForUser(userId);
        if (finalSubject) finalSubject = renderTemplate(finalSubject, mergeData);
        if (finalBody) finalBody = renderTemplate(finalBody, mergeData);
      }

      if (!finalSubject || !finalBody) {
        return res.status(400).json({ message: "Subject and body are required" });
      }

      // Send email
      const { emailService } = await import("../services/email");
      const sent = await emailService.sendCampaignEmail({
        to: user.email,
        subject: finalSubject,
        html: finalBody,
      });

      // Log communication
      await storage.createCommunicationLog({
        userId,
        channel: "email",
        direction: "outbound",
        subject: finalSubject,
        body: finalBody,
        status: sent ? "sent" : "failed",
        sentBy: (req as any).session?.userId || null,
      });

      res.json({ success: sent });
    } catch (error) {
      console.error("Error sending quick email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
