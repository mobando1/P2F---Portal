import { storage } from "../storage";
import { notificationService } from "./notification";

export class ClassSchedulerService {
  private reminderTimer: NodeJS.Timeout | null = null;

  // Start automatic reminder service
  startReminderService() {
    // Check for reminders every hour
    this.reminderTimer = setInterval(() => {
      this.checkAndSendReminders();
    }, 60 * 60 * 1000);

    console.log("Reminder service started");
  }

  stopReminderService() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }

  // Check and send reminders for classes happening in ~24 hours
  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

      const allUsers = await storage.getAllUsers();

      for (const user of allUsers) {
        const userClasses = await storage.getUserClasses(user.id);

        for (const classItem of userClasses) {
          const classDate = new Date(classItem.scheduledAt);

          if (classDate >= tomorrowStart && classDate < tomorrowEnd && classItem.status === "scheduled") {
            notificationService.sendClassReminder({
              studentId: user.id,
              tutorId: classItem.tutorId,
              scheduledAt: classDate,
              meetingLink: classItem.meetingLink || undefined,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  }
}
