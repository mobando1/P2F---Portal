import type { Express } from "express";
import { storage } from "../storage";
import { HighLevelService } from "../services/high-level";
import { requireAdmin } from "./auth";

const highLevelService =
  process.env.HIGH_LEVEL_API_KEY && process.env.HIGH_LEVEL_LOCATION_ID
    ? new HighLevelService(process.env.HIGH_LEVEL_API_KEY, process.env.HIGH_LEVEL_LOCATION_ID)
    : undefined;

export function registerHighLevelRoutes(app: Express) {
  // Webhook to receive High Level updates
  app.post("/api/high-level/webhook", async (req, res) => {
    try {
      const webhookData = req.body;
      console.log("Webhook recibido de High Level:", JSON.stringify(webhookData, null, 2));

      // Process completed appointment event
      if (webhookData.appointmentId && webhookData.status === "completed") {
        const appointmentId = webhookData.appointmentId;
        const contactId = webhookData.contactId;

        console.log(`Procesando clase completada:`);
        console.log(`   - Appointment ID: ${appointmentId}`);
        console.log(`   - Contact ID: ${contactId}`);

        const user = await storage.getUserByHighLevelContactId(contactId);
        if (!user) {
          console.log(`Usuario no encontrado con contactId: ${contactId}`);
          return res.json({ success: false, message: "Usuario no encontrado" });
        }

        console.log(`Usuario encontrado: ${user.firstName} ${user.lastName} (${user.email})`);

        const classes = await storage.getAllClasses();
        const classToUpdate = classes.find(
          (c) =>
            c.highLevelAppointmentId === appointmentId ||
            (c.userId === user.id && c.status === "scheduled")
        );

        if (classToUpdate) {
          await storage.updateClass(classToUpdate.id, {
            status: "completed",
            highLevelAppointmentId: appointmentId,
            highLevelContactId: contactId,
          });
          console.log(`Clase ${classToUpdate.id} marcada como completada automaticamente`);

          const currentCredits = user.classCredits || 0;
          if (currentCredits > 0) {
            const newCredits = currentCredits - 1;
            await storage.updateUser(user.id, { classCredits: newCredits });
            console.log(`Creditos actualizados: ${user.firstName} ${user.lastName}`);
            console.log(`   - Creditos antes: ${user.classCredits}`);
            console.log(`   - Creditos despues: ${newCredits}`);

            const progress = await storage.getUserProgress(user.id);
            if (progress) {
              await storage.updateUserProgress(user.id, {
                classesCompleted: (progress.classesCompleted || 0) + 1,
                learningHours: (
                  Number(progress.learningHours || 0) +
                  classToUpdate.duration / 60
                ).toString(),
              });
            }
          } else {
            console.log(`Usuario ${user.firstName} no tiene creditos disponibles`);
          }

          // Send class completion notification
          if (highLevelService) {
            const tutor = await storage.getTutor(classToUpdate.tutorId);
            if (tutor) {
              const completionMessage = `Clase completada exitosamente!

Hola ${user.firstName}, gracias por tu clase de espanol.

Resumen de tu clase:
Fecha: ${new Date(classToUpdate.scheduledAt).toLocaleDateString("es-ES")}
Profesor: ${tutor.name}
Duracion: ${classToUpdate.duration} minutos
Creditos restantes: ${(user.classCredits || 1) - 1}

Sigue practicando! Reserva tu proxima clase en el portal.

Saludos,
Equipo Passport2Fluency`;

              await highLevelService.sendCustomMessage(contactId, completionMessage);
              console.log(`Notificacion de completado enviada a ${user.email}`);
            }
          }
        } else {
          console.log(
            `No se encontro clase programada para el usuario ${user.firstName} ${user.lastName}`
          );
          console.log(`   - Buscando appointmentId: ${appointmentId}`);
          console.log(`   - Para userId: ${user.id}`);
        }
      }

      // Process cancelled appointment event
      if (webhookData.appointmentId && webhookData.status === "cancelled") {
        const appointmentId = webhookData.appointmentId;
        const contactId = webhookData.contactId;

        console.log(`Procesando cancelacion:`);
        console.log(`   - Appointment ID: ${appointmentId}`);
        console.log(`   - Contact ID: ${contactId}`);

        const user = await storage.getUserByHighLevelContactId(contactId);
        if (!user) {
          console.log(`Usuario no encontrado con contactId: ${contactId}`);
          return res.json({
            success: false,
            message: "Usuario no encontrado para cancelacion",
          });
        }

        const classes = await storage.getAllClasses();
        const classToCancel = classes.find(
          (c) =>
            c.highLevelAppointmentId === appointmentId ||
            (c.userId === user.id && c.status === "scheduled")
        );

        if (classToCancel) {
          await storage.updateClass(classToCancel.id, {
            status: "cancelled",
            highLevelAppointmentId: appointmentId,
            highLevelContactId: contactId,
          });
          console.log(`Clase ${classToCancel.id} cancelada desde High Level`);

          const newCredits = (user.classCredits || 0) + 1;
          await storage.updateUser(user.id, { classCredits: newCredits });
          console.log(`Credito restaurado: ${user.firstName} ${user.lastName}`);
          console.log(`   - Creditos restaurados: ${newCredits}`);

          // Notify cancellation
          if (highLevelService) {
            const cancellationMessage = `Clase cancelada

Hola ${user.firstName}, tu clase ha sido cancelada.

Tu credito ha sido restaurado automaticamente.
Creditos disponibles: ${newCredits}

Puedes reagendar cuando gustes en el portal.

Saludos,
Equipo Passport2Fluency`;

            await highLevelService.sendCustomMessage(contactId, cancellationMessage);
            console.log(`Notificacion de cancelacion enviada a ${user.email}`);
          }
        } else {
          console.log(
            `No se encontro clase para cancelar con appointmentId: ${appointmentId}`
          );
        }
      }

      // Respond to High Level that the webhook was processed
      res.json({
        success: true,
        processed: true,
        message: "Webhook procesado correctamente",
      });
    } catch (error: any) {
      console.error("Error processing High Level webhook:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Unknown error",
        message: "Error procesando webhook",
      });
    }
  });

  // Test High Level connection (admin only)
  app.post("/api/high-level/test-connection", requireAdmin, async (_req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no esta configurado" });
      }

      const testEmail = "test@passport2fluency.com";
      const contact = await highLevelService.findContactByEmail(testEmail);

      res.json({
        connected: true,
        message: "Conexion exitosa con High Level",
        testResult: contact
          ? "Contacto de prueba encontrado"
          : "API funcionando correctamente",
      });
    } catch (error: any) {
      res.status(500).json({
        connected: false,
        message: "Error conectando con High Level",
        error: error.message,
      });
    }
  });

  // Send test message via High Level (admin only)
  app.post("/api/high-level/send-test-message", requireAdmin, async (req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no esta configurado" });
      }

      const { email, message } = req.body;
      const contact = await highLevelService.findContactByEmail(email);

      if (!contact) {
        return res.status(404).json({ message: "Contacto no encontrado en High Level" });
      }

      await highLevelService.sendCustomMessage(contact.id, message);
      res.json({ message: "Mensaje de prueba enviado exitosamente" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test dual notifications (student + tutor) (admin only)
  app.post("/api/high-level/test-dual-notifications", requireAdmin, async (_req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no esta configurado" });
      }

      // Test data
      const testStudent = {
        id: 1,
        email: "student@test.com",
        firstName: "Juan",
        lastName: "Perez",
        phone: "+1234567890",
        username: "student@test.com",
        password: "",
        level: "beginner",
        avatar: null,
        userType: "customer",
        trialCompleted: true,
        classCredits: 5,
        highLevelContactId: null,
        trialTutorId: null,
        stripeCustomerId: null,
        aiSubscriptionActive: false,
        aiMessagesUsed: 0,
        aiMessagesResetAt: null,
        createdAt: new Date(),
      };

      const testTutor = {
        id: 1,
        name: "Maria Gonzalez",
        email: "maria.gonzalez@passport2fluency.com",
        phone: "+34 612 345 678",
        specialization: "Conversacion",
        bio: "Profesora experimentada",
        avatar: null,
        rating: "5.0",
        reviewCount: 10,
        hourlyRate: "25",
        isActive: true,
        classType: "adults",
        languageTaught: "spanish",
        createdAt: new Date(),
        country: "Espana",
        timezone: "Europe/Madrid",
        languages: ["Espanol", "Ingles"],
        certifications: ["DELE"],
        yearsOfExperience: 5,
        highLevelContactId: null,
        highLevelCalendarId: null,
      };

      const testClass = {
        id: 1,
        userId: 1,
        tutorId: 1,
        title: "Clase de Conversacion",
        description: "Clase de prueba para notificaciones duales",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 60,
        status: "scheduled",
        isTrial: false,
        classCategory: null,
        meetingLink: null,
        highLevelAppointmentId: null,
        highLevelContactId: null,
        createdAt: new Date(),
      };

      await highLevelService.sendClassBookingConfirmation(
        testStudent,
        testClass,
        testTutor
      );

      res.json({
        success: true,
        message: "Notificaciones duales enviadas exitosamente",
        details: {
          student: testStudent.email,
          tutor: testTutor.email,
          classDate: testClass.scheduledAt,
        },
      });
    } catch (error: any) {
      console.error("Error sending dual notifications:", error);
      res.status(500).json({
        success: false,
        message: "Error enviando notificaciones duales",
        error: error.message,
      });
    }
  });

  // Get High Level configuration status (admin only)
  app.get("/api/high-level/config", requireAdmin, async (_req, res) => {
    res.json({
      configured: !!highLevelService,
      hasApiKey: !!process.env.HIGH_LEVEL_API_KEY,
      hasLocationId: !!process.env.HIGH_LEVEL_LOCATION_ID,
    });
  });
}
