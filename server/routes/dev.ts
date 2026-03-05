import type { Express } from "express";
import { storage } from "../storage";

/**
 * Development-only routes for testing and debugging.
 * These are only registered when NODE_ENV === 'development'.
 */
export function registerDevRoutes(app: Express) {
  // Safety guard: return early if not in development mode
  if (process.env.NODE_ENV !== "development") {
    console.warn("registerDevRoutes called outside of development mode -- skipping registration");
    return;
  }

  // Test webhook endpoint - simulates a High Level webhook
  app.post("/api/test-webhook", async (_req, res) => {
    try {
      console.log("PRUEBA DE WEBHOOK - Simulando High Level...");

      const testWebhookData = {
        appointmentId: "APPT_TEST_001",
        contactId: "TEST_CONTACT_123",
        status: "completed",
        appointmentTitle: "Conversation Practice - Test",
        startTime: "2025-08-30T15:00:00Z",
        endTime: "2025-08-30T16:00:00Z",
        studentEmail: "juan.sanchez@example.com",
        studentName: "Juan Sanchez",
        timestamp: new Date().toISOString(),
      };

      console.log(
        "Simulando datos de High Level:",
        JSON.stringify(testWebhookData, null, 2)
      );

      const contactId = testWebhookData.contactId;
      const appointmentId = testWebhookData.appointmentId;

      const user = await storage.getUserByHighLevelContactId(contactId);
      if (!user) {
        return res.json({
          success: false,
          message: `Usuario no encontrado con contactId: ${contactId}`,
          testData: testWebhookData,
        });
      }

      console.log(
        `Usuario encontrado: ${user.firstName} ${user.lastName} (${user.email})`
      );
      console.log(`Creditos actuales: ${user.classCredits}`);

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

        const currentCredits = user.classCredits || 0;
        const newCredits = Math.max(0, currentCredits - 1);
        await storage.updateUser(user.id, { classCredits: newCredits });

        console.log(`Clase ${classToUpdate.id} marcada como completada`);
        console.log(`Creditos actualizados: ${user.classCredits} -> ${newCredits}`);

        res.json({
          success: true,
          message: "Webhook de prueba ejecutado exitosamente",
          details: {
            usuario: `${user.firstName} ${user.lastName}`,
            email: user.email,
            creditosAntes: user.classCredits,
            creditosDespues: newCredits,
            claseId: classToUpdate.id,
            appointmentId: appointmentId,
          },
          testData: testWebhookData,
        });
      } else {
        res.json({
          success: false,
          message: "No se encontro clase para procesar",
          details: {
            usuario: `${user.firstName} ${user.lastName}`,
            appointmentId: appointmentId,
            clasesDisponibles: classes.filter((c) => c.userId === user.id).length,
          },
        });
      }
    } catch (error: any) {
      console.error("Error en webhook de prueba:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error en webhook de prueba",
      });
    }
  });
}
