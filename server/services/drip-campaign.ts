import { storage } from "../storage";
import { emailService } from "./email";

/**
 * Drip Campaign Service
 *
 * Timeline:
 * 1. Registration → Welcome email (immediate)
 * 2. Trial booked → Pre-class tips (immediate)
 * 3. 24h after trial → Feedback request + CTA upgrade
 * 4. 3 days after trial → Discount reminder (if no purchase)
 * 5. 7 days after trial → Last chance (if no purchase)
 */
export const dripCampaignService = {
  /** Step 1: Called immediately on registration */
  async onUserRegistered(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      const lang: "es" | "en" = user.timezone?.includes("America") ? "es" : "en";
      await emailService.sendWelcomeEmail({
        to: user.email,
        name: user.firstName,
        lang,
      });

      await storage.createEmailCampaignEvent(userId, "welcome");
      console.log(`[Drip] Welcome email sent to user ${userId}`);
    } catch (error) {
      console.error("[Drip] Error sending welcome email:", error);
    }
  },

  /** Step 2: Called when a trial class is booked */
  async onTrialBooked(userId: number, scheduledAt: Date): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      const lang: "es" | "en" = user.timezone?.includes("America") ? "es" : "en";
      const date = scheduledAt.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
        weekday: "long", month: "long", day: "numeric",
      });

      // Get the tutor name
      const allClasses = await storage.getUserClasses(userId);
      const trialClass = allClasses.find(c => c.isTrial);
      let tutorName = "your tutor";
      if (trialClass) {
        const tutor = await storage.getTutor(trialClass.tutorId);
        if (tutor) tutorName = tutor.name;
      }

      await emailService.sendPreClassTips({
        to: user.email,
        name: user.firstName,
        tutorName,
        date,
        lang,
      });

      await storage.createEmailCampaignEvent(userId, "pre_class_tips");
      console.log(`[Drip] Pre-class tips sent to user ${userId}`);
    } catch (error) {
      console.error("[Drip] Error sending pre-class tips:", error);
    }
  },

  /** Periodic check — processes steps 3-5 automatically */
  async processAutomaticSteps(): Promise<void> {
    try {
      const allUsers = await storage.getAllUsers();
      const now = new Date();

      for (const user of allUsers) {
        // Only process trial/lead users who completed their trial
        if (!user.trialCompleted) continue;
        if (user.userType === "admin" || user.userType === "tutor") continue;

        const events = await storage.getEmailCampaignEvents(user.id);
        const sentSteps = new Set(events.map(e => e.campaignStep));

        // Skip if user already purchased (has credits beyond the free one)
        const hasPurchased = user.userType === "customer" || (user.classCredits || 0) > 1;

        // Find the trial completion date (when trialCompleted was set)
        // Use the trial class scheduledAt as a proxy
        const classes = await storage.getUserClasses(user.id);
        const trialClass = classes.find(c => c.isTrial);
        if (!trialClass) continue;

        const trialDate = new Date(trialClass.scheduledAt);
        const hoursSinceTrial = (now.getTime() - trialDate.getTime()) / (1000 * 60 * 60);

        const lang: "es" | "en" = user.timezone?.includes("America") ? "es" : "en";

        // Step 3: Feedback request (24h after trial)
        if (hoursSinceTrial >= 24 && !sentSteps.has("feedback_request")) {
          await emailService.sendFeedbackRequest({
            to: user.email,
            name: user.firstName,
            lang,
          });
          await storage.createEmailCampaignEvent(user.id, "feedback_request");
          console.log(`[Drip] Feedback request sent to user ${user.id}`);
        }

        // Step 4: Discount reminder (3 days after trial, only if no purchase)
        if (hoursSinceTrial >= 72 && !hasPurchased && !sentSteps.has("discount_reminder")) {
          await emailService.sendDiscountReminder({
            to: user.email,
            name: user.firstName,
            discountPercent: 15,
            lang,
          });
          await storage.createEmailCampaignEvent(user.id, "discount_reminder");
          console.log(`[Drip] Discount reminder sent to user ${user.id}`);
        }

        // Step 5: Last chance (7 days after trial, only if no purchase)
        if (hoursSinceTrial >= 168 && !hasPurchased && !sentSteps.has("last_chance")) {
          await emailService.sendLastChance({
            to: user.email,
            name: user.firstName,
            discountPercent: 20,
            lang,
          });
          await storage.createEmailCampaignEvent(user.id, "last_chance");
          console.log(`[Drip] Last chance sent to user ${user.id}`);
        }
      }
    } catch (error) {
      console.error("[Drip] Error processing automatic steps:", error);
    }
  },

  /** Start periodic check every hour */
  startPeriodicCheck(): void {
    setInterval(() => {
      this.processAutomaticSteps();
    }, 60 * 60 * 1000); // every hour

    // Run once on startup (delayed 30s to let server settle)
    setTimeout(() => {
      this.processAutomaticSteps();
    }, 30000);
  },
};
