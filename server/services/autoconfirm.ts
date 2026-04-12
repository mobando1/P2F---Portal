import { storage } from "../storage";
import { notificationService } from "./notification";
import { learningPathService } from "./learning-path";

/**
 * Autoconfirmation service for classes.
 *
 * Classes are only auto-completed after 48 HOURS past their scheduled end.
 * This gives tutors time to manually mark classes as completed or no-show.
 *
 * The tutor "complete class" button in the tutor portal is the primary way
 * classes should be marked complete. Auto-confirm is only a fallback.
 */
export const autoconfirmService = {
  async checkAndAutoconfirm() {
    try {
      const scheduledClasses = await storage.getScheduledClasses();
      const now = new Date();

      for (const cls of scheduledClasses) {
        const endTime = new Date(cls.scheduledAt);
        endTime.setMinutes(endTime.getMinutes() + (cls.duration || 60));

        // Only auto-complete classes that are 48+ hours past their end time
        // This gives tutors time to manually confirm or mark as no-show
        const gracePeriodMs = 48 * 60 * 60 * 1000; // 48 hours
        const autoconfirmAt = new Date(endTime.getTime() + gracePeriodMs);

        if (now < autoconfirmAt) continue;

        // Atomic: only completes if still scheduled (prevents double-complete)
        const completed = await storage.completeClassIfScheduled(cls.id);
        if (!completed) continue;

        console.log(`[autoconfirm] Auto-completed class ${cls.id} (48h+ past scheduled time)`);

        // Notify
        notificationService.onClassCompleted({
          studentId: cls.userId,
          tutorId: cls.tutorId,
          scheduledAt: new Date(cls.scheduledAt),
        });

        // Check learning path level advancement
        try {
          await learningPathService.checkAndAdvanceLevel(cls.userId);
        } catch {}
      }
    } catch (error) {
      console.error("Autoconfirm check error:", error);
    }
  },

  startPeriodicCheck() {
    setInterval(() => {
      this.checkAndAutoconfirm();
    }, 5 * 60 * 1000);

    // Run once on startup
    this.checkAndAutoconfirm();
  },
};
