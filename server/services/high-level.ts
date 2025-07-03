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

  // Enviar mensaje de confirmación de clase (AL ALUMNO Y AL PROFESOR)
  async sendClassBookingConfirmation(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const classDate = new Date(classData.scheduledAt).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 1. ENVIAR CONFIRMACIÓN AL ALUMNO
      await this.sendStudentBookingConfirmation(user, classData, tutor, classDate);
      
      // 2. ENVIAR CONFIRMACIÓN AL PROFESOR
      await this.sendTutorBookingConfirmation(user, classData, tutor, classDate);
      
      console.log(`Confirmaciones enviadas a alumno ${user.email} y profesor ${tutor.email}`);
    } catch (error) {
      console.error("Error sending class booking confirmations:", error);
      throw error;
    }
  }

  // Confirmación para el ALUMNO
  private async sendStudentBookingConfirmation(user: User, classData: Class, tutor: Tutor, classDate: string): Promise<void> {
    const studentContactId = await this.createOrUpdateContact(user);
    
    const studentMessage = `¡Hola ${user.firstName}! 

Tu clase de español ha sido confirmada:

📅 Fecha: ${classDate}
👨‍🏫 Profesor: ${tutor.name}
💰 Precio: $${tutor.hourlyRate}/hora
📧 Email del profesor: ${tutor.email}

Te enviaremos un recordatorio 24 horas antes de tu clase.

¡Nos vemos pronto!
Equipo Passport2Fluency`;

    await this.sendCustomMessage(studentContactId, studentMessage);
    console.log(`✅ Confirmación enviada al alumno: ${user.email}`);
  }

  // Confirmación para el PROFESOR
  private async sendTutorBookingConfirmation(user: User, classData: Class, tutor: Tutor, classDate: string): Promise<void> {
    // Crear contacto del profesor en High Level si no existe
    const tutorUser = {
      id: tutor.id,
      email: tutor.email,
      firstName: tutor.name.split(' ')[0],
      lastName: tutor.name.split(' ').slice(1).join(' ') || '',
      phone: tutor.phone,
      username: tutor.email,
      password: '',
      level: 'tutor',
      avatar: tutor.avatar,
      createdAt: new Date()
    };

    const tutorContactId = await this.createOrUpdateContact(tutorUser);
    
    const tutorMessage = `¡Hola ${tutor.name}! 

Tienes una nueva clase programada:

📅 Fecha: ${classDate}
👨‍🎓 Alumno: ${user.firstName} ${user.lastName}
📧 Email del alumno: ${user.email}
📱 Teléfono: ${user.phone || 'No proporcionado'}
💰 Tarifa: $${tutor.hourlyRate}/hora

Por favor confirma tu disponibilidad para esta clase.

¡Gracias por ser parte del equipo!
Passport2Fluency`;

    await this.sendCustomMessage(tutorContactId, tutorMessage);
    console.log(`✅ Confirmación enviada al profesor: ${tutor.email}`);
  }

  // Enviar recordatorio de clase (AL ALUMNO Y AL PROFESOR)
  async sendClassReminder(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const classTime = new Date(classData.scheduledAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // 1. RECORDATORIO AL ALUMNO
      await this.sendStudentReminder(user, classData, tutor, classTime);
      
      // 2. RECORDATORIO AL PROFESOR
      await this.sendTutorReminder(user, classData, tutor, classTime);
      
      console.log(`Recordatorios enviados a alumno ${user.email} y profesor ${tutor.email}`);
    } catch (error) {
      console.error("Error sending class reminders:", error);
      throw error;
    }
  }

  // Recordatorio para el ALUMNO
  private async sendStudentReminder(user: User, classData: Class, tutor: Tutor, classTime: string): Promise<void> {
    const studentContactId = await this.createOrUpdateContact(user);
    
    const studentMessage = `¡Recordatorio! 

Tu clase de español es mañana a las ${classTime} con ${tutor.name}.

Asegúrate de tener:
✅ Conexión a internet estable
✅ Un lugar tranquilo para estudiar
✅ Tus materiales de estudio

📧 Email del profesor: ${tutor.email}
Link de la clase: [Se enviará 15 min antes]

¡Te esperamos!
Passport2Fluency`;

    await this.sendCustomMessage(studentContactId, studentMessage);
    console.log(`✅ Recordatorio enviado al alumno: ${user.email}`);
  }

  // Recordatorio para el PROFESOR
  private async sendTutorReminder(user: User, classData: Class, tutor: Tutor, classTime: string): Promise<void> {
    const tutorUser = {
      id: tutor.id,
      email: tutor.email,
      firstName: tutor.name.split(' ')[0],
      lastName: tutor.name.split(' ').slice(1).join(' ') || '',
      phone: tutor.phone,
      username: tutor.email,
      password: '',
      level: 'tutor',
      avatar: tutor.avatar,
      createdAt: new Date()
    };

    const tutorContactId = await this.createOrUpdateContact(tutorUser);
    
    const tutorMessage = `¡Recordatorio! 

Tienes una clase programada para mañana a las ${classTime}:

👨‍🎓 Alumno: ${user.firstName} ${user.lastName}
📧 Email del alumno: ${user.email}
📱 Teléfono: ${user.phone || 'No proporcionado'}

Asegúrate de tener:
✅ Conexión estable
✅ Material de clase preparado
✅ Ambiente adecuado para enseñar

¡Excelente clase!
Passport2Fluency`;

    await this.sendCustomMessage(tutorContactId, tutorMessage);
    console.log(`✅ Recordatorio enviado al profesor: ${tutor.email}`);
  }

  // Enviar notificación de cancelación (AL ALUMNO Y AL PROFESOR)
  async sendClassCancellation(user: User, classData: Class, tutor: Tutor): Promise<void> {
    try {
      const classDate = new Date(classData.scheduledAt).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 1. CANCELACIÓN AL ALUMNO
      await this.sendStudentCancellation(user, classData, tutor, classDate);
      
      // 2. CANCELACIÓN AL PROFESOR
      await this.sendTutorCancellation(user, classData, tutor, classDate);
      
      console.log(`Notificaciones de cancelación enviadas a alumno ${user.email} y profesor ${tutor.email}`);
    } catch (error) {
      console.error("Error sending cancellation notifications:", error);
      throw error;
    }
  }

  // Cancelación para el ALUMNO
  private async sendStudentCancellation(user: User, classData: Class, tutor: Tutor, classDate: string): Promise<void> {
    const studentContactId = await this.createOrUpdateContact(user);
    
    const studentMessage = `Hola ${user.firstName},

Tu clase del ${classDate} con ${tutor.name} ha sido cancelada.

Tu crédito de clase ha sido restaurado a tu cuenta y puedes reagendar cuando gustes.

Si tienes preguntas, contáctanos.

Saludos,
Equipo Passport2Fluency`;

    await this.sendCustomMessage(studentContactId, studentMessage);
    console.log(`✅ Cancelación enviada al alumno: ${user.email}`);
  }

  // Cancelación para el PROFESOR
  private async sendTutorCancellation(user: User, classData: Class, tutor: Tutor, classDate: string): Promise<void> {
    const tutorUser = {
      id: tutor.id,
      email: tutor.email,
      firstName: tutor.name.split(' ')[0],
      lastName: tutor.name.split(' ').slice(1).join(' ') || '',
      phone: tutor.phone,
      username: tutor.email,
      password: '',
      level: 'tutor',
      avatar: tutor.avatar,
      createdAt: new Date()
    };

    const tutorContactId = await this.createOrUpdateContact(tutorUser);
    
    const tutorMessage = `Hola ${tutor.name},

La clase del ${classDate} con el alumno ${user.firstName} ${user.lastName} ha sido cancelada.

Tu horario ha sido liberado y puedes recibir nuevas reservas para ese tiempo.

Si tienes preguntas, contáctanos.

Saludos,
Equipo Passport2Fluency`;

    await this.sendCustomMessage(tutorContactId, tutorMessage);
    console.log(`✅ Cancelación enviada al profesor: ${tutor.email}`);
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