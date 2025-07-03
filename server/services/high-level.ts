import { type User, type Class, type Tutor } from "@shared/schema";

interface HighLevelContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface HighLevelMessage {
  contactId: string;
  templateId?: string;
  customMessage?: string;
  scheduledDate?: string;
}

export class HighLevelService {
  private apiKey: string;
  private locationId: string;
  private baseUrl = "https://rest.gohighlevel.com/v1";

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  private async makeRequest(endpoint: string, method: string = "GET", data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28"
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`High Level API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Crear o actualizar contacto en High Level
  async createOrUpdateContact(user: User): Promise<string> {
    const contactData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      locationId: this.locationId,
      tags: ["passport2fluency", "student"]
    };

    try {
      // Intentar encontrar contacto existente por email
      const existingContact = await this.findContactByEmail(user.email);
      
      if (existingContact) {
        // Actualizar contacto existente
        await this.makeRequest(`/contacts/${existingContact.id}`, "PUT", contactData);
        return existingContact.id;
      } else {
        // Crear nuevo contacto
        const response = await this.makeRequest("/contacts", "POST", contactData);
        return response.contact.id;
      }
    } catch (error) {
      console.error("Error creating/updating High Level contact:", error);
      throw error;
    }
  }

  // Buscar contacto por email
  async findContactByEmail(email: string): Promise<HighLevelContact | null> {
    try {
      const response = await this.makeRequest(`/contacts/search?email=${encodeURIComponent(email)}`);
      return response.contacts?.[0] || null;
    } catch (error) {
      console.error("Error finding contact:", error);
      return null;
    }
  }

  // Enviar mensaje de confirmación de clase
  async sendClassBookingConfirmation(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const contactId = await this.createOrUpdateContact(user);
      
      const classDate = new Date(classData.scheduledAt).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `¡Hola ${user.firstName}! 

Tu clase de español ha sido confirmada:

📅 Fecha: ${classDate}
👨‍🏫 Profesor: ${tutor.name}
💰 Precio: $${tutor.hourlyRate}/hora

Te enviaremos un recordatorio 24 horas antes de tu clase.

¡Nos vemos pronto!
Equipo Passport2Fluency`;

      await this.sendCustomMessage(contactId, message);
      
      console.log(`Confirmación de clase enviada a ${user.email}`);
    } catch (error) {
      console.error("Error sending class booking confirmation:", error);
      throw error;
    }
  }

  // Enviar recordatorio de clase
  async sendClassReminder(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const contactId = await this.createOrUpdateContact(user);
      
      const classTime = new Date(classData.scheduledAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `¡Recordatorio! 

Tu clase de español es mañana a las ${classTime} con ${tutor.name}.

Asegúrate de tener:
✅ Conexión a internet estable
✅ Un lugar tranquilo para estudiar
✅ Tus materiales de estudio

Link de la clase: [Se enviará 15 min antes]

¡Te esperamos!
Passport2Fluency`;

      await this.sendCustomMessage(contactId, message);
      
      console.log(`Recordatorio enviado a ${user.email}`);
    } catch (error) {
      console.error("Error sending class reminder:", error);
      throw error;
    }
  }

  // Enviar notificación de cancelación
  async sendClassCancellation(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const contactId = await this.createOrUpdateContact(user);
      
      const classDate = new Date(classData.scheduledAt).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `Hola ${user.firstName},

Tu clase del ${classDate} con ${tutor.name} ha sido cancelada.

Tu crédito de clase ha sido restaurado a tu cuenta y puedes reagendar cuando gustes.

Si tienes preguntas, contáctanos.

Saludos,
Equipo Passport2Fluency`;

      await this.sendCustomMessage(contactId, message);
      
      console.log(`Notificación de cancelación enviada a ${user.email}`);
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
      throw error;
    }
  }

  // Enviar mensaje personalizado
  async sendCustomMessage(contactId: string, message: string): Promise<void> {
    const messageData = {
      type: "SMS",
      contactId: contactId,
      message: message
    };

    await this.makeRequest("/conversations/messages", "POST", messageData);
  }

  // Programar recordatorio automático
  async scheduleClassReminder(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const reminderDate = new Date(classData.scheduledAt);
      reminderDate.setHours(reminderDate.getHours() - 24); // 24 horas antes

      const contactId = await this.createOrUpdateContact(user);
      
      const campaignData = {
        name: `Class Reminder - ${user.firstName} - ${classData.id}`,
        contactId: contactId,
        scheduledDate: reminderDate.toISOString(),
        message: `Recordatorio: Tu clase de español es mañana con ${tutor.name}. ¡Te esperamos!`
      };

      await this.makeRequest("/campaigns", "POST", campaignData);
      
      console.log(`Recordatorio programado para ${reminderDate.toLocaleString()}`);
    } catch (error) {
      console.error("Error scheduling class reminder:", error);
      throw error;
    }
  }
}