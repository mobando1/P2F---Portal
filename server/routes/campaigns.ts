import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./auth";
import { evaluateSegment, countSegment, type SegmentFilters } from "../services/segment-engine";
import { getAvailableMergeTags, getMergeDataForUser, renderTemplate } from "../services/merge-tag-engine";
import { sendCampaign } from "../services/campaign-sender";
import { syncOfferToStripe, updateStripeCoupon, deleteStripeCoupon } from "../services/stripe-coupon-sync";
import crypto from "crypto";

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

      // Sync to Stripe
      const syncResult = await syncOfferToStripe(offer);
      let stripeSyncStatus = syncResult.status;
      if (syncResult.status === "synced") {
        await storage.updateOffer(offer.id, {
          stripeCouponId: syncResult.stripeCouponId,
          stripePromotionCodeId: syncResult.stripePromotionCodeId,
        });
        offer.stripeCouponId = syncResult.stripeCouponId;
        offer.stripePromotionCodeId = syncResult.stripePromotionCodeId;
      }

      res.json({ ...offer, stripeSyncStatus });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getOffer(id);
      if (!existing) return res.status(404).json({ message: "Offer not found" });

      const updated = await storage.updateOffer(id, req.body);
      if (!updated) return res.status(404).json({ message: "Offer not found" });

      // Re-sync to Stripe (delete old, create new)
      const syncResult = await updateStripeCoupon({ ...existing, ...updated });
      let stripeSyncStatus = syncResult.status;
      if (syncResult.status === "synced") {
        await storage.updateOffer(id, {
          stripeCouponId: syncResult.stripeCouponId,
          stripePromotionCodeId: syncResult.stripePromotionCodeId,
        });
        updated.stripeCouponId = syncResult.stripeCouponId;
        updated.stripePromotionCodeId = syncResult.stripePromotionCodeId;
      }

      res.json({ ...updated, stripeSyncStatus });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getOffer(id);
      if (existing) await deleteStripeCoupon(existing);
      const success = await storage.deleteOffer(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Manual Stripe re-sync for an offer
  app.post("/api/admin/campaigns/offers/:id/sync-stripe", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const offer = await storage.getOffer(id);
      if (!offer) return res.status(404).json({ message: "Offer not found" });

      const syncResult = offer.stripeCouponId
        ? await updateStripeCoupon(offer)
        : await syncOfferToStripe(offer);

      if (syncResult.status === "synced") {
        await storage.updateOffer(id, {
          stripeCouponId: syncResult.stripeCouponId,
          stripePromotionCodeId: syncResult.stripePromotionCodeId,
        });
      }
      res.json(syncResult);
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

  // ===== Resend Email Tracking Webhook =====
  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
      if (webhookSecret) {
        // Verify Svix signature
        const svixId = req.headers["svix-id"] as string;
        const svixTimestamp = req.headers["svix-timestamp"] as string;
        const svixSignature = req.headers["svix-signature"] as string;
        if (!svixId || !svixTimestamp || !svixSignature) {
          return res.status(401).json({ message: "Missing svix headers" });
        }
        const payload = JSON.stringify(req.body);
        const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
        const secret = Buffer.from(webhookSecret.replace(/^whsec_/, ""), "base64");
        const expectedSig = crypto.createHmac("sha256", secret).update(signedContent).digest("base64");
        const isValid = svixSignature.split(" ").some((sig) => {
          const sigValue = sig.replace(/^v1,/, "");
          return crypto.timingSafeEqual(Buffer.from(sigValue), Buffer.from(expectedSig));
        });
        if (!isValid) return res.status(401).json({ message: "Invalid signature" });
      }

      const { type, data } = req.body;
      const emailId = data?.email_id as string | undefined;

      if (!emailId) return res.status(200).json({ received: true });

      const recipient = await storage.getRecipientByResendId(emailId);
      if (!recipient) return res.status(200).json({ received: true });

      if (type === "email.delivered") {
        await storage.updateCampaignRecipient(recipient.id, { status: "delivered" });
      } else if (type === "email.opened") {
        await storage.updateCampaignRecipient(recipient.id, { status: "opened", openedAt: new Date() });
        await storage.incrementCampaignOpened(recipient.campaignId);
      } else if (type === "email.clicked") {
        await storage.updateCampaignRecipient(recipient.id, { status: "clicked", clickedAt: new Date() });
        await storage.incrementCampaignClicked(recipient.campaignId);
      } else if (type === "email.bounced" || type === "email.complained") {
        await storage.updateCampaignRecipient(recipient.id, { status: "bounced" });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Resend webhook error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Newsletter Subscribers =====
  app.get("/api/admin/campaigns/subscribers", requireAdmin, async (req, res) => {
    try {
      const { status, source, search } = req.query as Record<string, string>;
      const result = await storage.getNewsletterSubscribers({ status, source, search });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/subscribers", requireAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const subscriber = await storage.createNewsletterSubscriber({
        email, firstName, lastName, source: "manual", status: "active",
      });
      res.json(subscriber);
    } catch (error: any) {
      if (error.code === "23505") return res.status(409).json({ message: "Email already subscribed" });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/subscribers/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteNewsletterSubscriber(parseInt(req.params.id));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public subscribe endpoint
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const subscriber = await storage.upsertNewsletterSubscriber({
        email, firstName, lastName, source: "website", status: "active",
      });
      res.json({ success: true, subscriber });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public unsubscribe endpoint
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      await storage.unsubscribeNewsletter(email);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
