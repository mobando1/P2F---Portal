import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertClassSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import express from "express";
import { HighLevelService } from "./services/high-level";
import { TutorManagementService } from "./services/tutor-management";
import { ClassSchedulerService } from "./services/class-scheduler";
import { CalendarIntegrationService } from "./services/calendar-integration";

// 🧪 FORZAR MODO TEST para pruebas con 4242 4242 4242 4242
const stripe = new Stripe(process.env.TESTING_STRIPE_SECRET_KEY || "sk_test_fake_key", {
  apiVersion: "2025-06-30.basil",
});

// Configurar servicios de High Level
const highLevelService = process.env.HIGH_LEVEL_API_KEY && process.env.HIGH_LEVEL_LOCATION_ID 
  ? new HighLevelService(process.env.HIGH_LEVEL_API_KEY, process.env.HIGH_LEVEL_LOCATION_ID)
  : undefined;

const tutorManagement = new TutorManagementService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

// Configurar servicio de programación de recordatorios
const classScheduler = new ClassSchedulerService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

// Configurar servicio de integración de calendarios
const calendarService = new CalendarIntegrationService(
  process.env.HIGH_LEVEL_API_KEY,
  process.env.HIGH_LEVEL_LOCATION_ID
);

export async function registerRoutes(app: Express): Promise<void> {
  // Servir archivos estáticos desde attached_assets
  app.use('/attached_assets', express.static('attached_assets'));

  // 🧪 DEBUG: Ruta para verificar configuración de Stripe
  app.get("/api/stripe-debug", (req, res) => {
    const testingKey = process.env.TESTING_STRIPE_SECRET_KEY;
    const prodKey = process.env.STRIPE_SECRET_KEY;
    // 🧪 FORZAR uso de testing key para pruebas
    const currentKey = testingKey || "sk_test_fake_key";
    const isTestMode = currentKey.startsWith('sk_test_');
    
    res.json({
      isTestMode,
      keyType: isTestMode ? 'TEST' : 'LIVE',
      keyPrefix: currentKey.substring(0, 12) + "...",
      testingKeyExists: !!testingKey,
      prodKeyExists: !!prodKey,
      message: isTestMode ? "✅ MODO TEST - Debe funcionar con 4242..." : "❌ MODO LIVE - Requiere tarjetas reales"
    });
  });
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd set up proper session management here
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          level: user.level,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Create default subscription - First create a basic plan if it doesn't exist
      // For now, skip creating default subscription as it should be handled by Stripe integration
      // This will be properly implemented when user purchases a plan

      // Create initial progress
      await storage.updateUserProgress(user.id, {
        classesCompleted: 0,
        learningHours: "0.00",
        currentStreak: 0,
        totalVideosWatched: 0,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          level: user.level,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        level: user.level,
        avatar: user.avatar,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const user = await storage.getUser(userId);
      const subscription = await storage.getUserSubscription(userId);
      const progress = await storage.getUserProgress(userId);
      const upcomingClasses = await storage.getUpcomingClasses(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          level: user.level,
          avatar: user.avatar,
        },
        subscription,
        progress,
        upcomingClasses,
        stats: {
          classesBooked: upcomingClasses.length + (progress?.classesCompleted || 0),
          classesCompleted: progress?.classesCompleted || 0,
          learningHours: progress?.learningHours || "0.00",
          currentLevel: user.level,
          remainingClasses: Math.max((user.classCredits || 0), 0),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tutors
  app.get("/api/tutors", async (req, res) => {
    try {
      const tutors = await storage.getAllTutors();
      res.json(tutors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Classes
  app.get("/api/classes/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const classes = await storage.getUserClasses(userId);
      
      // Get tutor info for each class
      const classesWithTutors = await Promise.all(
        classes.map(async (classItem) => {
          const tutor = await storage.getTutor(classItem.tutorId);
          return {
            ...classItem,
            tutorName: tutor?.name || "Unknown Tutor",
          };
        })
      );
      
      res.json(classesWithTutors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      
      // Check if user has remaining classes
      const subscription = await storage.getUserSubscription(classData.userId);
      if (!subscription) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Check user's class credits instead of subscription limits
      const userClassCredits = await storage.getUser(classData.userId);
      if (!userClassCredits || (userClassCredits.classCredits || 0) <= 0) {
        return res.status(400).json({ message: "No remaining class credits available" });
      }

      const newClass = await storage.createClass(classData);
      
      // Deduct class credit from user instead of updating subscription
      await storage.updateUser(classData.userId, {
        classCredits: (userClassCredits.classCredits || 0) - 1,
      });

      // 🚀 ENVIAR NOTIFICACIONES AUTOMÁTICAS DUALES Y PROGRAMAR RECORDATORIOS
      try {
        if (highLevelService) {
          // Obtener datos del alumno y profesor
          const user = await storage.getUser(classData.userId);
          const tutor = await storage.getTutor(classData.tutorId);
          
          if (user && tutor) {
            // 1. Enviar confirmaciones inmediatas a AMBOS (alumno + profesor)
            await highLevelService.sendClassBookingConfirmation(user, newClass, tutor);
            console.log(`✅ Confirmaciones duales enviadas: ${user.email} y ${tutor.email}`);
            
            // 2. Programar recordatorio automático para 24h antes
            classScheduler.scheduleClassReminder(user, newClass, tutor);
            console.log(`⏰ Recordatorio programado para ${new Date(newClass.scheduledAt).toLocaleString()}`);
          }
        }
      } catch (notificationError) {
        console.error("Error enviando notificaciones automáticas:", notificationError);
        // No fallar la reserva por error de notificación
      }

      res.status(201).json(newClass);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/classes/:id/cancel", async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { userId } = req.body;
      
      // Obtener datos de la clase ANTES de cancelarla
      const userClasses = await storage.getUserClasses(userId);
      const classToCancel = userClasses.find(c => c.id === classId);
      
      const success = await storage.cancelClass(classId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Class not found or not authorized" });
      }

      // Refund the class credit to user
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          classCredits: (user.classCredits || 0) + 1,
        });
      }

      // 🚀 ENVIAR NOTIFICACIONES AUTOMÁTICAS DE CANCELACIÓN
      try {
        if (highLevelService && classToCancel) {
          const user = await storage.getUser(userId);
          const tutor = await storage.getTutor(classToCancel.tutorId);
          
          if (user && tutor) {
            // Enviar notificaciones de cancelación a AMBOS (alumno + profesor)
            await highLevelService.sendClassCancellation(user, classToCancel, tutor);
            console.log(`✅ Notificaciones de cancelación enviadas: ${user.email} y ${tutor.email}`);
          }
        }
      } catch (notificationError) {
        console.error("Error enviando notificaciones de cancelación:", notificationError);
        // No fallar la cancelación por error de notificación
      }

      res.json({ message: "Class cancelled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Calendar Integration Routes
  
  // Get tutor availability for a specific date
  app.get("/api/calendar/tutor/:tutorId/availability", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.tutorId);
      const { date } = req.query;
      
      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const availability = await calendarService.getTutorAvailability(tutorId, date);
      res.json(availability);
    } catch (error) {
      console.error("Error getting tutor availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all tutors availability for a date
  app.get("/api/calendar/availability", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const availability = await calendarService.getAllTutorsAvailability(date);
      res.json(availability);
    } catch (error) {
      console.error("Error getting all tutors availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Book a class with specific tutor
  app.post("/api/calendar/book", async (req, res) => {
    try {
      const { userId, tutorId, date, startTime, endTime } = req.body;
      
      if (!userId || !tutorId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const result = await calendarService.bookClassWithTutor(
        userId,
        tutorId,
        date,
        startTime,
        endTime
      );
      
      if (result.success) {
        res.json({ message: result.message, appointmentId: result.appointmentId });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error booking class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Webhook para recibir actualizaciones de High Level
  app.post("/api/high-level/webhook", async (req, res) => {
    try {
      const webhookData = req.body;
      console.log("📨 Webhook recibido de High Level:", JSON.stringify(webhookData, null, 2));
      
      // Procesar evento de cita completada
      if (webhookData.appointmentId && webhookData.status === 'completed') {
        const appointmentId = webhookData.appointmentId;
        const contactId = webhookData.contactId;
        
        console.log(`🔍 Procesando clase completada:`);
        console.log(`   - Appointment ID: ${appointmentId}`);
        console.log(`   - Contact ID: ${contactId}`);
        
        // Buscar usuario por contactId de High Level
        const user = await storage.getUserByHighLevelContactId(contactId);
        if (!user) {
          console.log(`⚠️ Usuario no encontrado con contactId: ${contactId}`);
          return res.json({ success: false, message: "Usuario no encontrado" });
        }
        
        console.log(`👤 Usuario encontrado: ${user.firstName} ${user.lastName} (${user.email})`);
        
        // Buscar la clase específica por appointmentId
        const classes = await storage.getAllClasses();
        const classToUpdate = classes.find(c => 
          c.highLevelAppointmentId === appointmentId || 
          (c.userId === user.id && c.status === 'scheduled')
        );
        
        if (classToUpdate) {
          // Marcar clase como completada
          await storage.updateClass(classToUpdate.id, { 
            status: 'completed',
            highLevelAppointmentId: appointmentId,
            highLevelContactId: contactId
          });
          console.log(`✅ Clase ${classToUpdate.id} marcada como completada automáticamente`);
          
          // Descontar clase del balance del usuario
          const currentCredits = user.classCredits || 0;
          if (currentCredits > 0) {
            const newCredits = currentCredits - 1;
            await storage.updateUser(user.id, { classCredits: newCredits });
            console.log(`💳 Créditos actualizados: ${user.firstName} ${user.lastName}`);
            console.log(`   - Créditos antes: ${user.classCredits}`);
            console.log(`   - Créditos después: ${newCredits}`);
            
            // Actualizar progreso del usuario
            const progress = await storage.getUserProgress(user.id);
            if (progress) {
              await storage.updateUserProgress(user.id, {
                classesCompleted: (progress.classesCompleted || 0) + 1,
                learningHours: (Number(progress.learningHours || 0) + (classToUpdate.duration / 60)).toString()
              });
            }
          } else {
            console.log(`⚠️ Usuario ${user.firstName} no tiene créditos disponibles`);
          }
          
          // Enviar notificación de clase completada
          if (highLevelService) {
            const tutor = await storage.getTutor(classToUpdate.tutorId);
            if (tutor) {
              const completionMessage = `¡Clase completada exitosamente! 🎉

Hola ${user.firstName}, gracias por tu clase de español.

📊 Resumen de tu clase:
📅 Fecha: ${new Date(classToUpdate.scheduledAt).toLocaleDateString('es-ES')}
👨‍🏫 Profesor: ${tutor.name}
⏱️ Duración: ${classToUpdate.duration} minutos
💳 Créditos restantes: ${(user.classCredits || 1) - 1}

¡Sigue practicando! Reserva tu próxima clase en el portal.

Saludos,
Equipo Passport2Fluency 🇪🇸`;

              await highLevelService.sendCustomMessage(contactId, completionMessage);
              console.log(`📧 Notificación de completado enviada a ${user.email}`);
            }
          }
          
        } else {
          console.log(`⚠️ No se encontró clase programada para el usuario ${user.firstName} ${user.lastName}`);
          console.log(`   - Buscando appointmentId: ${appointmentId}`);
          console.log(`   - Para userId: ${user.id}`);
        }
      }
      
      // Procesar evento de cita cancelada  
      if (webhookData.appointmentId && webhookData.status === 'cancelled') {
        const appointmentId = webhookData.appointmentId;
        const contactId = webhookData.contactId;
        
        console.log(`🔍 Procesando cancelación:`);
        console.log(`   - Appointment ID: ${appointmentId}`);
        console.log(`   - Contact ID: ${contactId}`);
        
        // Buscar usuario por contactId
        const user = await storage.getUserByHighLevelContactId(contactId);
        if (!user) {
          console.log(`⚠️ Usuario no encontrado con contactId: ${contactId}`);
          return res.json({ success: false, message: "Usuario no encontrado para cancelación" });
        }
        
        // Buscar la clase específica
        const classes = await storage.getAllClasses();
        const classToCancel = classes.find(c => 
          c.highLevelAppointmentId === appointmentId ||
          (c.userId === user.id && c.status === 'scheduled')
        );
        
        if (classToCancel) {
          await storage.updateClass(classToCancel.id, { 
            status: 'cancelled',
            highLevelAppointmentId: appointmentId,
            highLevelContactId: contactId
          });
          console.log(`❌ Clase ${classToCancel.id} cancelada desde High Level`);
          
          // Restaurar crédito si la clase fue cancelada
          const newCredits = (user.classCredits || 0) + 1;
          await storage.updateUser(user.id, { classCredits: newCredits });
          console.log(`🔄 Crédito restaurado: ${user.firstName} ${user.lastName}`);
          console.log(`   - Créditos restaurados: ${newCredits}`);
          
          // Notificar cancelación
          if (highLevelService) {
            const cancellationMessage = `Clase cancelada ❌

Hola ${user.firstName}, tu clase ha sido cancelada.

💳 Tu crédito ha sido restaurado automáticamente.
📊 Créditos disponibles: ${newCredits}

Puedes reagendar cuando gustes en el portal.

Saludos,
Equipo Passport2Fluency`;

            await highLevelService.sendCustomMessage(contactId, cancellationMessage);
            console.log(`📧 Notificación de cancelación enviada a ${user.email}`);
          }
        } else {
          console.log(`⚠️ No se encontró clase para cancelar con appointmentId: ${appointmentId}`);
        }
      }

      // Responder a High Level que el webhook fue procesado
      res.json({ 
        success: true, 
        processed: true,
        message: "Webhook procesado correctamente"
      });
    } catch (error: any) {
      console.error("❌ Error processing High Level webhook:", error);
      res.status(500).json({ 
        success: false, 
        error: error?.message || "Unknown error",
        message: "Error procesando webhook"
      });
    }
  });
  
  // Cancel a class (enhanced version)
  app.put("/api/calendar/cancel/:classId", async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const result = await calendarService.cancelClass(classId, userId);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error cancelling class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Videos
  app.get("/api/videos", async (req, res) => {
    try {
      const { level } = req.query;
      
      let videos;
      if (level && typeof level === "string") {
        videos = await storage.getVideosByLevel(level);
      } else {
        videos = await storage.getAllVideos();
      }
      
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription management
  app.put("/api/subscription/:id", async (req, res) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { planId, status, nextBillingDate } = req.body;
      
      const updatedSubscription = await storage.updateSubscription(subscriptionId, {
        planId,
        status,
        nextBillingDate,
      });
      
      if (!updatedSubscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(updatedSubscription);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, metadata = {} } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        description: metadata.packageName || "Class package payment",
        metadata: {
          platform: "passport2fluency",
          ...metadata
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { planId, userId } = req.body;
      
      if (!planId || !userId) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      // Detectar si estamos en modo testing
      const isTestMode = (process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "").startsWith('sk_test_');

      // Información de planes
      const planInfo = {
        1: { name: "Starter Flow", price: 11996, classes: 4, description: "4 clases por mes" },
        2: { name: "Momentum Plan", price: 21999, classes: 8, description: "8 clases por mes" },
        3: { name: "Fluency Boost", price: 29999, classes: 12, description: "12 clases por mes" },
      };

      const currentPlan = planInfo[planId as keyof typeof planInfo];
      if (!currentPlan) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      let priceId: string;

      if (isTestMode) {
        // MODO TEST: Crear precio dinámico 
        console.log(`🧪 Modo TEST detectado - Creando precio dinámico para ${currentPlan.name}`);
        
        const price = await stripe.prices.create({
          unit_amount: currentPlan.price,
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: `${currentPlan.name} - ${currentPlan.description}`,
          },
          metadata: {
            planId: planId.toString(),
            platform: "passport2fluency",
            testMode: "true"
          }
        });
        priceId = price.id;
      } else {
        // MODO PRODUCCIÓN: Usar Price IDs configurados
        const stripePriceIds = {
          1: process.env.STRIPE_PRICE_ID_PLAN_1, // Starter Flow - 4 clases/mes
          2: process.env.STRIPE_PRICE_ID_PLAN_2, // Momentum Plan - 8 clases/mes
          3: process.env.STRIPE_PRICE_ID_PLAN_3, // Fluency Boost - 12 clases/mes
        };

        const selectedPriceId = stripePriceIds[planId as keyof typeof stripePriceIds];
        
        if (!selectedPriceId) {
          return res.status(400).json({ message: "Invalid plan ID or Stripe Price ID not configured" });
        }
        priceId = selectedPriceId;
      }

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: userId.toString(),
            platform: "passport2fluency"
          }
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create subscription with proper metadata
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          platform: "passport2fluency"
        }
      });

      const invoice = subscription.latest_invoice;
      const paymentIntent = typeof invoice === 'string' ? null : (invoice as any)?.payment_intent;

      res.json({ 
        clientSecret: paymentIntent?.client_secret,
        subscriptionId: subscription.id
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { planId, userId } = req.body;
      
      if (!planId || !userId) {
        return res.status(400).json({ message: "Missing required data" });
      }

      // Detectar si estamos en modo testing
      const isTestMode = (process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "").startsWith('sk_test_');

      // Información de planes
      const planInfo = {
        1: { name: "Starter Flow", price: 11996, classes: 4, description: "4 clases por mes" },
        2: { name: "Momentum Plan", price: 21999, classes: 8, description: "8 clases por mes" },
        3: { name: "Fluency Boost", price: 29999, classes: 12, description: "12 clases por mes" },
      };

      const currentPlan = planInfo[planId as keyof typeof planInfo];
      if (!currentPlan) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      let priceId: string;

      if (isTestMode) {
        // MODO TEST: Crear precio dinámico 
        console.log(`🧪 Checkout TEST - Creando precio dinámico para ${currentPlan.name}`);
        
        const price = await stripe.prices.create({
          unit_amount: currentPlan.price,
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: `${currentPlan.name} - ${currentPlan.description}`,
          },
          metadata: {
            planId: planId.toString(),
            platform: "passport2fluency",
            testMode: "true"
          }
        });
        priceId = price.id;
      } else {
        // MODO PRODUCCIÓN: Usar Price IDs configurados
        const stripePriceIds = {
          1: process.env.STRIPE_PRICE_ID_PLAN_1, // Starter Flow - $119.96
          2: process.env.STRIPE_PRICE_ID_PLAN_2, // Momentum Plan - $219.99
          3: process.env.STRIPE_PRICE_ID_PLAN_3, // Fluency Boost - $299.99
        };

        const selectedPriceId = stripePriceIds[planId as keyof typeof stripePriceIds];
        
        if (!selectedPriceId) {
          return res.status(400).json({ message: "Invalid plan ID or Stripe Price ID not configured" });
        }
        priceId = selectedPriceId;
      }

      // Get user for customer information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create checkout session with proper subscription metadata
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: user.email,
        client_reference_id: userId.toString(),
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          platform: "passport2fluency"
        },
        // CRITICAL: Pass metadata to subscription object as well
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            planId: planId.toString(),
            platform: "passport2fluency"
          }
        },
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/packages`,
      });

      res.json({ 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // WEBHOOK MOVED TO server/index.ts to ensure proper middleware order
  
  /*
  // TODO: Clean up corrupted webhook code below - temporarily commented
  
  // All webhook logic moved to server/index.ts for proper middleware order

  // Rutas para gestión de profesores
            
  // ===== START TUTOR MANAGEMENT ROUTES =====
            console.error('❌ Error processing subscription checkout:', error);
            return res.status(500).json({ error: 'Failed to process subscription' });
          }
        } else if (session.mode === 'payment') {
          // Handle one-time package purchases
          const { userId, packageId, type } = session.metadata || {};
          
          if (userId && packageId && type === 'package') {
            try {
              const user = await storage.getUser(parseInt(userId));
              if (user) {
                const packageCredits = {
                  '1': 5,   // 5-class package
                  '2': 10,  // 10-class package
                  '3': 20,  // 20-class package
                };
                
                const credits = packageCredits[packageId as keyof typeof packageCredits] || 0;
                await storage.updateUser(parseInt(userId), {
                  classCredits: (user.classCredits || 0) + credits
                });
                
                console.log(`✅ Added ${credits} class credits to user ${userId} for package ${packageId}`);
              }
            } catch (error) {
              console.error('❌ Error processing package purchase:', error);
            }
          }
        }
      }

      // Handle one-time payments (packages) - for direct payment intents
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, type, packageId } = paymentIntent.metadata || {};

        // Only process if this is a package purchase and not part of a subscription
        if (userId && type === 'package' && packageId && !paymentIntent.invoice) {
          try {
            const user = await storage.getUser(parseInt(userId));
            if (!user) {
              console.error(`❌ User not found for payment intent: ${userId}`);
              return res.status(404).json({ error: 'User not found' });
            }
            
            const packageCredits = {
              '1': 5,   // 5-class package
              '2': 10,  // 10-class package
              '3': 20,  // 20-class package
            };
            
            const credits = packageCredits[packageId as keyof typeof packageCredits];
            if (!credits) {
              console.error(`❌ Invalid package ID: ${packageId}`);
              return res.status(400).json({ error: 'Invalid package ID' });
            }
            
            await storage.updateUser(parseInt(userId), {
              classCredits: (user.classCredits || 0) + credits
            });
            
            console.log(`✅ Added ${credits} class credits to user ${userId} for package ${packageId}`);
          } catch (error) {
            console.error('❌ Error processing package payment:', error);
          }
        }
      }

      // Handle recurring subscription payments (invoice.payment_succeeded)
      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        
        // Only process if this is a subscription invoice (not one-time payment)
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          try {
            // Find subscription by Stripe subscription ID
            const dbSubscription = await storage.getSubscriptionByStripeId(invoice.subscription as string);
            
            if (!dbSubscription) {
              console.log(`⚠️ Subscription not found in database: ${invoice.subscription}`);
              return res.json({received: true, processed: false, reason: 'subscription_not_found'});
            }
            
            // Get plan details
            const planDetails = {
              1: { name: 'Starter Flow', classesIncluded: 4 },
              2: { name: 'Momentum Plan', classesIncluded: 8 },
              3: { name: 'Fluency Boost', classesIncluded: 12 },
            };
            
            const plan = planDetails[dbSubscription.planId as keyof typeof planDetails];
            
            if (plan) {
              // Add class credits for recurring payment
              const user = await storage.getUser(dbSubscription.userId);
              if (user) {
                await storage.updateUser(dbSubscription.userId, {
                  classCredits: (user.classCredits || 0) + plan.classesIncluded
                });
                
                // Update subscription next billing date
                await storage.updateSubscription(dbSubscription.id, {
                  nextBillingDate: new Date(invoice.lines.data[0].period.end * 1000),
                  status: 'active'
                });
                
                console.log(`✅ Recurring payment: Added ${plan.classesIncluded} credits to user ${dbSubscription.userId} for plan ${plan.name}`);
              }
            }
          } catch (error) {
            console.error('❌ Error processing recurring payment:', error);
          }
        }
      }
      
      // Handle subscription creation (when subscription is first created)
      if (event.type === 'customer.subscription.created') {
        const subscription = event.data.object;
        const { userId, planId } = subscription.metadata || {};

        if (userId && planId) {
          try {
            // Check if subscription already exists
            const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
            if (existingSubscription) {
              console.log(`⚠️ Subscription already exists: ${subscription.id}`);
              return res.json({received: true, processed: false, reason: 'subscription_already_exists'});
            }
            
            // Create subscription record (credits will be added via checkout.session.completed or invoice.payment_succeeded)
            await storage.createSubscription({
              userId: parseInt(userId),
              planId: parseInt(planId),
              stripeSubscriptionId: subscription.id,
              status: subscription.status as 'active' | 'cancelled' | 'expired',
              nextBillingDate: new Date(subscription.current_period_end * 1000),
            });
            
            console.log(`✅ Created subscription record for user ${userId}, plan ${planId}`);
          } catch (error) {
            console.error('❌ Error creating subscription record:', error);
          }
        }
      }

      // Handle subscription cancellation
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        
        // Update subscription status in database
        const dbSubscription = await storage.getSubscriptionByStripeId(subscription.id);
        if (dbSubscription) {
          await storage.updateSubscription(dbSubscription.id, {
            status: 'cancelled'
          });
          console.log(`✅ Cancelled subscription ${subscription.id}`);
        }
      }

      res.json({received: true, processed: true, eventId: event.id});
    } catch (error: any) {
      console.error(`❌ Webhook error for event ${event?.id || 'unknown'}:`, error);
      
      // Remove from processed events if processing failed
      if (event?.id) {
        processedWebhookEvents.delete(event.id);
      }
      
      // Return appropriate error response
      if (error.type === 'StripeSignatureVerificationError') {
        res.status(400).json({ error: 'Invalid signature' });
      } else {
        res.status(500).json({ 
          error: 'Webhook processing failed', 
          message: error.message,
          eventId: event?.id 
        });
      }
    }
  });
  */

  // Rutas para gestión de profesores  
  app.post("/api/tutors", async (req, res) => {
    try {
      const tutorData = req.body;
      const tutor = await tutorManagement.createTutorProfile(tutorData);
      res.status(201).json(tutor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/tutors/:id", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const updateData = req.body;
      const tutor = await tutorManagement.updateTutorProfile(tutorId, updateData);
      res.json(tutor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/tutors/:id/availability", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const availability = req.body.availability;
      await tutorManagement.setTutorAvailability(tutorId, availability);
      res.json({ message: "Disponibilidad actualizada" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/tutors/:id/stats", async (req, res) => {
    try {
      const tutorId = parseInt(req.params.id);
      const stats = await tutorManagement.getTutorStats(tutorId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tutors/bulk-import", async (req, res) => {
    try {
      const tutorsData = req.body.tutors;
      const result = await tutorManagement.bulkImportTutors(tutorsData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Rutas para High Level
  app.post("/api/high-level/test-connection", async (req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no está configurado" });
      }
      
      // Intentar hacer una llamada de prueba
      const testEmail = "test@passport2fluency.com";
      const contact = await highLevelService.findContactByEmail(testEmail);
      
      res.json({ 
        connected: true, 
        message: "Conexión exitosa con High Level",
        testResult: contact ? "Contacto de prueba encontrado" : "API funcionando correctamente"
      });
    } catch (error: any) {
      res.status(500).json({ 
        connected: false, 
        message: "Error conectando con High Level", 
        error: error.message 
      });
    }
  });

  app.post("/api/high-level/send-test-message", async (req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no está configurado" });
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

  // Endpoint para probar notificaciones duales (alumno + profesor)
  app.post("/api/high-level/test-dual-notifications", async (req, res) => {
    try {
      if (!highLevelService) {
        return res.status(400).json({ message: "High Level no está configurado" });
      }

      // Datos de prueba
      const testStudent = {
        id: 1,
        email: 'student@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+1234567890',
        username: 'student@test.com',
        password: '',
        level: 'beginner',
        avatar: null,
        userType: 'customer',
        trialCompleted: true,
        classCredits: 5,
        highLevelContactId: null,
        stripeCustomerId: null,
        createdAt: new Date()
      };

      const testTutor = {
        id: 1,
        name: 'María González',
        email: 'maria.gonzalez@passport2fluency.com',
        phone: '+34 612 345 678',
        specialization: 'Conversación',
        bio: 'Profesora experimentada',
        avatar: null,
        rating: '5.0',
        reviewCount: 10,
        hourlyRate: '25',
        isActive: true,
        createdAt: new Date(),
        country: 'España',
        timezone: 'Europe/Madrid',
        languages: ['Español', 'Inglés'],
        certifications: ['DELE'],
        yearsOfExperience: 5,
        highLevelContactId: null,
        highLevelCalendarId: null
      };

      const testClass = {
        id: 1,
        userId: 1,
        tutorId: 1,
        title: 'Clase de Conversación',
        description: 'Clase de prueba para notificaciones duales',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
        duration: 60,
        status: 'scheduled',
        meetingLink: null,
        highLevelAppointmentId: null,
        highLevelContactId: null,
        createdAt: new Date()
      };

      // Enviar notificación dual
      await highLevelService.sendClassBookingConfirmation(testStudent, testClass, testTutor);

      res.json({
        success: true,
        message: 'Notificaciones duales enviadas exitosamente',
        details: {
          student: testStudent.email,
          tutor: testTutor.email,
          classDate: testClass.scheduledAt
        }
      });
    } catch (error: any) {
      console.error('Error sending dual notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error enviando notificaciones duales',
        error: error.message
      });
    }
  });

  // Endpoint para extraer Price ID de Payment Links de Stripe
  app.post("/api/extract-price-id", async (req, res) => {
    try {
      const { paymentLinkUrl } = req.body;
      
      if (!paymentLinkUrl) {
        return res.status(400).json({ message: "Payment Link URL is required" });
      }

      // Extraer el Payment Link ID de la URL
      const linkId = paymentLinkUrl.split('/').pop()?.split('?')[0];
      
      if (!linkId) {
        return res.status(400).json({ message: "Invalid Payment Link URL format" });
      }

      // Obtener información del Payment Link desde Stripe
      const paymentLink = await stripe.paymentLinks.retrieve(linkId, {
        expand: ['line_items']
      });

      // Verificar que existen line_items
      if (!paymentLink.line_items?.data?.length) {
        return res.status(400).json({ message: "No line items found in payment link" });
      }

      // Extraer información del precio
      const lineItem = paymentLink.line_items.data[0];
      
      if (!lineItem.price) {
        return res.status(400).json({ message: "No price information found" });
      }

      const priceInfo = {
        priceId: lineItem.price.id,
        amount: lineItem.price.unit_amount || 0,
        currency: lineItem.price.currency,
        productId: lineItem.price.product,
        nickname: lineItem.price.nickname,
        interval: lineItem.price.recurring?.interval,
        intervalCount: lineItem.price.recurring?.interval_count
      };

      console.log(`🔍 Price ID extraído: ${priceInfo.priceId}`);
      console.log(`💰 Precio: ${priceInfo.amount / 100} ${priceInfo.currency.toUpperCase()}`);
      
      res.json(priceInfo);
    } catch (error: any) {
      console.error('Error extracting Price ID:', error);
      res.status(500).json({ message: "Error extracting Price ID: " + error.message });
    }
  });

  // Endpoint para probar webhook de High Level (SOLO DESARROLLO)
  app.post("/api/test-webhook", async (req, res) => {
    try {
      console.log("🧪 PRUEBA DE WEBHOOK - Simulando High Level...");
      
      // Simular webhook de clase completada
      const testWebhookData = {
        appointmentId: "APPT_TEST_001",
        contactId: "TEST_CONTACT_123", 
        status: "completed",
        appointmentTitle: "Conversation Practice - Test",
        startTime: "2025-08-30T15:00:00Z",
        endTime: "2025-08-30T16:00:00Z",
        studentEmail: "juan.sanchez@example.com",
        studentName: "Juan Sánchez",
        timestamp: new Date().toISOString()
      };

      console.log("📨 Simulando datos de High Level:", JSON.stringify(testWebhookData, null, 2));
      
      // Procesar directamente como si fuera el webhook real
      const contactId = testWebhookData.contactId;
      const appointmentId = testWebhookData.appointmentId;
      
      // Buscar usuario por contactId
      const user = await storage.getUserByHighLevelContactId(contactId);
      if (!user) {
        return res.json({
          success: false,
          message: `Usuario no encontrado con contactId: ${contactId}`,
          testData: testWebhookData
        });
      }
      
      console.log(`👤 Usuario encontrado: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`💳 Créditos actuales: ${user.classCredits}`);
      
      // Buscar clase
      const classes = await storage.getAllClasses();
      const classToUpdate = classes.find(c => 
        c.highLevelAppointmentId === appointmentId || 
        (c.userId === user.id && c.status === 'scheduled')
      );
      
      if (classToUpdate) {
        // Simular el procesamiento completo
        await storage.updateClass(classToUpdate.id, { 
          status: 'completed',
          highLevelAppointmentId: appointmentId,
          highLevelContactId: contactId
        });
        
        const currentCredits = user.classCredits || 0;
        const newCredits = Math.max(0, currentCredits - 1);
        await storage.updateUser(user.id, { classCredits: newCredits });
        
        console.log(`✅ Clase ${classToUpdate.id} marcada como completada`);
        console.log(`💳 Créditos actualizados: ${user.classCredits} → ${newCredits}`);
        
        res.json({
          success: true,
          message: "✅ Webhook de prueba ejecutado exitosamente",
          details: {
            usuario: `${user.firstName} ${user.lastName}`,
            email: user.email,
            creditosAntes: user.classCredits,
            creditosDespues: newCredits,
            claseId: classToUpdate.id,
            appointmentId: appointmentId
          },
          testData: testWebhookData
        });
      } else {
        res.json({
          success: false,
          message: "❌ No se encontró clase para procesar",
          details: {
            usuario: `${user.firstName} ${user.lastName}`,
            appointmentId: appointmentId,
            clasesDisponibles: classes.filter(c => c.userId === user.id).length
          }
        });
      }
      
    } catch (error: any) {
      console.error("❌ Error en webhook de prueba:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: "Error en webhook de prueba"
      });
    }
  });

  // Iniciar el servicio de recordatorios automáticos
  if (process.env.HIGH_LEVEL_API_KEY && process.env.HIGH_LEVEL_LOCATION_ID) {
    classScheduler.startReminderService();
    console.log("🚀 Sistema de notificaciones automáticas iniciado");
  }

  // Server is now created in index.ts
}
