import { storage } from "../storage-simple";
import { HighLevelService } from "./high-level";

export class ClassSchedulerService {
  private highLevelService?: HighLevelService;
  private reminderTimer: NodeJS.Timeout | null = null;

  constructor(apiKey?: string, locationId?: string) {
    if (apiKey && locationId) {
      this.highLevelService = new HighLevelService(apiKey, locationId);
    }
  }

  // Iniciar el servicio de recordatorios automáticos
  startReminderService() {
    // Verificar recordatorios cada hora
    this.reminderTimer = setInterval(() => {
      this.checkAndSendReminders();
    }, 60 * 60 * 1000); // 1 hora

    console.log("🔔 Servicio de recordatorios automáticos iniciado");
  }

  // Detener el servicio
  stopReminderService() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
      console.log("🔔 Servicio de recordatorios detenido");
    }
  }

  // Verificar y enviar recordatorios para clases que son en 24 horas
  private async checkAndSendReminders() {
    try {
      if (!this.highLevelService) {
        console.log("High Level no configurado para recordatorios");
        return;
      }

      console.log("🔍 Verificando clases para recordatorios...");

      // Obtener todas las clases programadas para mañana (aproximadamente)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

      // Buscar clases de todos los usuarios (esto podría optimizarse)
      const users = await this.getAllUsers();
      
      for (const user of users) {
        const userClasses = await storage.getUserClasses(user.id);
        
        for (const classItem of userClasses) {
          const classDate = new Date(classItem.scheduledAt);
          
          // Si la clase es mañana y está en estado 'scheduled'
          if (classDate >= tomorrowStart && 
              classDate < tomorrowEnd && 
              classItem.status === 'scheduled') {
            
            const tutor = await storage.getTutor(classItem.tutorId);
            if (tutor) {
              await this.sendClassReminder(user, classItem, tutor);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error verificando recordatorios:", error);
    }
  }

  // Enviar recordatorio individual
  private async sendClassReminder(user: any, classItem: any, tutor: any) {
    try {
      if (this.highLevelService) {
        await this.highLevelService.sendClassReminder(user, classItem, tutor);
        console.log(`📤 Recordatorio enviado para clase de ${user.email} con ${tutor.name}`);
      }
    } catch (error) {
      console.error(`Error enviando recordatorio para ${user.email}:`, error);
    }
  }

  // Método auxiliar para obtener todos los usuarios (esto podría optimizarse)
  private async getAllUsers() {
    // Esto es una implementación simplificada
    // En producción, deberías tener un método más eficiente
    const users = [];
    
    try {
      // Intentar obtener usuarios del 1 al 1000 (ajustar según necesidad)
      for (let i = 1; i <= 1000; i++) {
        try {
          const user = await storage.getUser(i);
          if (user) {
            users.push(user);
          }
        } catch {
          // Usuario no existe, continuar
        }
      }
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
    }

    return users;
  }

  // Programar recordatorio específico para una clase (alternativa más precisa)
  scheduleClassReminder(user: any, classItem: any, tutor: any) {
    const classDate = new Date(classItem.scheduledAt);
    const reminderTime = new Date(classDate.getTime() - 24 * 60 * 60 * 1000); // 24 horas antes
    const now = new Date();

    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          await this.sendClassReminder(user, classItem, tutor);
        } catch (error) {
          console.error("Error enviando recordatorio programado:", error);
        }
      }, delay);

      console.log(`⏰ Recordatorio programado para ${reminderTime.toLocaleString()}`);
    }
  }
}