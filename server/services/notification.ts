import { storage } from "../storage";
import { emailService } from "./email";
import { wsService } from "./websocket";

function formatDate(date: Date, lang: "es" | "en"): string {
  return date.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date, lang: "es" | "en"): string {
  return date.toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function createAndPush(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
}) {
  const notification = await storage.createNotification(data);
  wsService.sendToUser(data.userId, {
    type: "notification:new",
    data: notification,
  });
  return notification;
}

export const notificationService = {
  /**
   * Called when a class is booked — notifies student + tutor
   */
  async onClassBooked(params: {
    studentId: number;
    tutorId: number;
    classId: number;
    scheduledAt: Date;
    meetingLink?: string;
  }): Promise<void> {
    try {
      const { studentId, tutorId, classId, scheduledAt, meetingLink } = params;
      const student = await storage.getUser(studentId);
      const tutor = await storage.getTutor(tutorId);
      if (!student || !tutor) return;

      const lang: "es" | "en" = (student.timezone?.includes("America") ? "es" : "en") as "es" | "en";
      const date = formatDate(scheduledAt, lang);
      const time = formatTime(scheduledAt, lang);

      // In-app notification for student
      await createAndPush({
        userId: studentId,
        type: "booking",
        title: lang === "es" ? "Clase Confirmada" : "Class Confirmed",
        message: lang === "es"
          ? `Tu clase con ${tutor.name} ha sido reservada para el ${date} a las ${time}.`
          : `Your class with ${tutor.name} is booked for ${date} at ${time}.`,
        link: "/dashboard",
        isRead: false,
      });

      // In-app notification for tutor (via userId)
      if (tutor.userId) {
        await createAndPush({
          userId: tutor.userId,
          type: "booking",
          title: lang === "es" ? "Nueva Clase Agendada" : "New Class Booked",
          message: lang === "es"
            ? `${student.firstName} ${student.lastName} ha agendado una clase para el ${date} a las ${time}.`
            : `${student.firstName} ${student.lastName} booked a class for ${date} at ${time}.`,
          link: "/tutor-portal",
          isRead: false,
        });
      }

      // Check student email preferences before sending
      const studentPrefs = await storage.getNotificationPreferences(studentId);
      if (!studentPrefs || studentPrefs.emailBooking !== false) {
        emailService.sendBookingConfirmation({
          to: student.email,
          studentName: `${student.firstName} ${student.lastName}`,
          tutorName: tutor.name,
          date,
          time,
          meetingLink,
          lang,
        });
      }

      // Email to tutor (tutors always receive booking emails)
      if (tutor.userId) {
        const tutorUser = await storage.getUser(tutor.userId);
        if (tutorUser) {
          emailService.sendTutorNewBooking({
            to: tutorUser.email,
            tutorName: tutor.name,
            studentName: `${student.firstName} ${student.lastName}`,
            date,
            time,
            lang,
          });
        }
      }
    } catch (error) {
      console.error("Error in onClassBooked notification:", error);
    }
  },

  /**
   * Called when a class is cancelled — notifies student + tutor
   */
  async onClassCancelled(params: {
    studentId: number;
    tutorId: number;
    scheduledAt: Date;
  }): Promise<void> {
    try {
      const { studentId, tutorId, scheduledAt } = params;
      const student = await storage.getUser(studentId);
      const tutor = await storage.getTutor(tutorId);
      if (!student || !tutor) return;

      const lang: "es" | "en" = "es";
      const date = formatDate(scheduledAt, lang);

      // In-app notification for student
      await createAndPush({
        userId: studentId,
        type: "cancellation",
        title: lang === "es" ? "Clase Cancelada" : "Class Cancelled",
        message: lang === "es"
          ? `Tu clase con ${tutor.name} del ${date} ha sido cancelada. Tu crédito ha sido devuelto.`
          : `Your class with ${tutor.name} on ${date} has been cancelled. Your credit has been refunded.`,
        link: "/dashboard",
        isRead: false,
      });

      // In-app notification for tutor
      if (tutor.userId) {
        await createAndPush({
          userId: tutor.userId,
          type: "cancellation",
          title: lang === "es" ? "Clase Cancelada" : "Class Cancelled",
          message: lang === "es"
            ? `La clase con ${student.firstName} ${student.lastName} del ${date} ha sido cancelada.`
            : `The class with ${student.firstName} ${student.lastName} on ${date} has been cancelled.`,
          link: "/tutor-portal",
          isRead: false,
        });
      }

      // Check student email preferences before sending cancellation
      const cancelPrefs = await storage.getNotificationPreferences(studentId);
      if (!cancelPrefs || cancelPrefs.emailCancellation !== false) {
        emailService.sendCancellationNotification({
          to: student.email,
          name: `${student.firstName} ${student.lastName}`,
          tutorName: tutor.name,
          date,
          lang,
        });
      }

      if (tutor.userId) {
        const tutorUser = await storage.getUser(tutor.userId);
        if (tutorUser) {
          emailService.sendCancellationNotification({
            to: tutorUser.email,
            name: tutor.name,
            tutorName: `${student.firstName} ${student.lastName}`,
            date,
            lang,
          });
        }
      }
    } catch (error) {
      console.error("Error in onClassCancelled notification:", error);
    }
  },

  /**
   * Called when a class is completed — notifies student
   */
  async onClassCompleted(params: {
    studentId: number;
    tutorId: number;
    scheduledAt: Date;
  }): Promise<void> {
    try {
      const { studentId, tutorId, scheduledAt } = params;
      const student = await storage.getUser(studentId);
      const tutor = await storage.getTutor(tutorId);
      if (!student || !tutor) return;

      const lang: "es" | "en" = "es";

      await createAndPush({
        userId: studentId,
        type: "system",
        title: lang === "es" ? "Clase Completada" : "Class Completed",
        message: lang === "es"
          ? `Tu clase con ${tutor.name} ha sido completada. ¡Sigue practicando!`
          : `Your class with ${tutor.name} has been completed. Keep practicing!`,
        link: "/dashboard",
        isRead: false,
      });
    } catch (error) {
      console.error("Error in onClassCompleted notification:", error);
    }
  },

  /**
   * Send class reminder (called 24h before class)
   */
  async sendClassReminder(params: {
    studentId: number;
    tutorId: number;
    scheduledAt: Date;
    meetingLink?: string;
  }): Promise<void> {
    try {
      const { studentId, tutorId, scheduledAt, meetingLink } = params;
      const student = await storage.getUser(studentId);
      const tutor = await storage.getTutor(tutorId);
      if (!student || !tutor) return;

      const lang: "es" | "en" = "es";
      const date = formatDate(scheduledAt, lang);
      const time = formatTime(scheduledAt, lang);

      // In-app
      await createAndPush({
        userId: studentId,
        type: "reminder",
        title: lang === "es" ? "Recordatorio de Clase" : "Class Reminder",
        message: lang === "es"
          ? `Tienes una clase con ${tutor.name} mañana a las ${time}.`
          : `You have a class with ${tutor.name} tomorrow at ${time}.`,
        link: "/dashboard",
        isRead: false,
      });

      // Check student email preferences before sending reminder
      const reminderPrefs = await storage.getNotificationPreferences(studentId);
      if (!reminderPrefs || reminderPrefs.emailReminder !== false) {
        emailService.sendClassReminder({
          to: student.email,
          name: `${student.firstName} ${student.lastName}`,
          tutorName: tutor.name,
          date,
          time,
          meetingLink,
          lang,
        });
      }
    } catch (error) {
      console.error("Error in sendClassReminder notification:", error);
    }
  },
};
