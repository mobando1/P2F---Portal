import { storage } from "../storage";
import { notificationService } from "./notification";

export class ClassSchedulerService {
  private reminderTimer: NodeJS.Timeout | null = null;
  private remindedClassIds = new Set<number>();

  // Start automatic reminder service
  startReminderService() {
    // Check every 30 minutes (more reliable than hourly)
    this.reminderTimer = setInterval(() => {
      this.checkAndSendReminders();
    }, 30 * 60 * 1000);

    // Run immediately on startup (delayed 15s to let DB settle)
    setTimeout(() => {
      this.checkAndSendReminders();
    }, 15000);

    console.log("[Scheduler] Reminder service started (checks every 30min + on startup)");
  }

  stopReminderService() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }

  // Check and send reminders for classes happening in the next 24-26 hours
  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);

      const allUsers = await storage.getAllUsers();

      for (const user of allUsers) {
        if (user.userType === "admin") continue;

        const userClasses = await storage.getUserClasses(user.id);

        for (const classItem of userClasses) {
          // Skip if already reminded
          if (this.remindedClassIds.has(classItem.id)) continue;

          const classDate = new Date(classItem.scheduledAt);

          // Send reminder for classes between 24h and 26h from now
          if (classDate >= in24h && classDate <= in26h && classItem.status === "scheduled") {
            console.log(`[Scheduler] Sending reminder for class ${classItem.id} (user ${user.id}, scheduled ${classDate.toISOString()})`);

            await notificationService.sendClassReminder({
              studentId: user.id,
              tutorId: classItem.tutorId,
              scheduledAt: classDate,
              meetingLink: classItem.meetingLink || undefined,
            });

            // Mark as reminded to prevent duplicates
            this.remindedClassIds.add(classItem.id);
          }
        }
      }

      // Clean up old IDs (keep set small — remove IDs for classes already past)
      if (this.remindedClassIds.size > 500) {
        this.remindedClassIds.clear();
      }
    } catch (error) {
      console.error("[Scheduler] Error checking reminders:", error);
    }
  }
}
