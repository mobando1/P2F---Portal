import { HighLevelService } from './high-level';
import { storage } from '../storage';

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  appointmentId?: string;
}

export interface CalendarAvailability {
  tutorId: number;
  date: string;
  slots: TimeSlot[];
}

export class CalendarIntegrationService {
  private highLevelService?: HighLevelService;

  constructor(apiKey?: string, locationId?: string) {
    if (apiKey && locationId) {
      this.highLevelService = new HighLevelService(apiKey, locationId);
    }
  }

  /**
   * Obtiene disponibilidad de un profesor específico para una fecha
   */
  async getTutorAvailability(tutorId: number, date: string): Promise<TimeSlot[]> {
    try {
      const tutor = await storage.getTutor(tutorId);
      if (!tutor || !tutor.highLevelContactId) {
        throw new Error('Tutor not found or missing High Level contact ID');
      }

      if (!this.highLevelService) {
        // Retornar slots mockeados para desarrollo
        return this.getMockAvailability(date);
      }

      // Obtener disponibilidad del calendario de High Level
      const availability = await this.highLevelService.getCalendarAvailability(
        tutor.highLevelContactId,
        date,
        date
      );

      return availability;
    } catch (error) {
      console.error('Error getting tutor availability:', error);
      return [];
    }
  }

  /**
   * Obtiene disponibilidad de todos los profesores para una fecha
   */
  async getAllTutorsAvailability(date: string): Promise<CalendarAvailability[]> {
    try {
      const tutors = await storage.getAllTutors();
      const availabilities: CalendarAvailability[] = [];

      for (const tutor of tutors) {
        const slots = await this.getTutorAvailability(tutor.id, date);
        availabilities.push({
          tutorId: tutor.id,
          date,
          slots
        });
      }

      return availabilities;
    } catch (error) {
      console.error('Error getting all tutors availability:', error);
      return [];
    }
  }

  /**
   * Reserva una clase con un profesor específico
   */
  async bookClassWithTutor(
    userId: number,
    tutorId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ success: boolean; appointmentId?: string; message?: string }> {
    try {
      const user = await storage.getUser(userId);
      const tutor = await storage.getTutor(tutorId);

      if (!user || !tutor) {
        return { success: false, message: 'User or tutor not found' };
      }

      // Verificar créditos de clase
      if (!user.classCredits || user.classCredits <= 0) {
        return { success: false, message: 'No class credits available' };
      }

      if (!this.highLevelService) {
        // Crear clase en storage para desarrollo
        const classData = {
          userId,
          tutorId,
          title: `Clase de Español - ${tutor.name}`,
          scheduledAt: new Date(`${date}T${startTime}`),
          duration: 60,
          status: 'scheduled' as const,
          notes: `Clase reservada con ${tutor.name}`,
          highLevelAppointmentId: `mock_${Date.now()}`
        };

        await storage.createClass(classData);
        
        // Reducir créditos
        await storage.updateUser(userId, {
          classCredits: user.classCredits - 1
        });

        return { 
          success: true, 
          appointmentId: classData.highLevelAppointmentId,
          message: 'Class booked successfully (development mode)'
        };
      }

      // Crear cita en High Level
      const appointmentData = {
        contactId: user.highLevelContactId || '',
        tutorId: tutor.highLevelContactId || '',
        title: `Clase de Español - ${user.firstName} ${user.lastName}`,
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${endTime}:00`,
        description: `Clase con ${tutor.name} - ${tutor.specialization}`,
        notes: `Estudiante: ${user.firstName} ${user.lastName} (${user.email})`
      };

      const appointment = await this.highLevelService.createAppointment(appointmentData);

      if (appointment.success) {
        // Crear registro de clase en storage
        const classData = {
          userId,
          tutorId,
          title: `Clase de Español - ${user.firstName} ${user.lastName}`,
          scheduledAt: new Date(`${date}T${startTime}`),
          duration: 60,
          status: 'scheduled' as const,
          notes: `Clase reservada con ${tutor.name}`,
          highLevelAppointmentId: appointment.appointmentId
        };

        await storage.createClass(classData);
        
        // Reducir créditos
        await storage.updateUser(userId, {
          classCredits: user.classCredits - 1
        });

        // Enviar notificaciones
        await this.sendBookingNotifications(user, tutor, classData);

        return {
          success: true,
          appointmentId: appointment.appointmentId,
          message: 'Class booked successfully'
        };
      }

      return { success: false, message: 'Failed to create appointment in High Level' };
    } catch (error) {
      console.error('Error booking class:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Cancela una clase
   */
  async cancelClass(classId: number, userId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const classItem = await storage.getAllClasses().then(c => c.find(cl => cl.id === classId));
      
      if (!classItem || classItem.userId !== userId) {
        return { success: false, message: 'Class not found or not authorized' };
      }

      if (classItem.status === 'cancelled') {
        return { success: false, message: 'Class already cancelled' };
      }

      // Verificar que la clase no sea en las próximas 24 horas
      const now = new Date();
      const classDate = new Date(classItem.scheduledAt);
      const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        return { success: false, message: 'Cannot cancel class within 24 hours' };
      }

      // Cancelar en High Level
      if (this.highLevelService && classItem.highLevelAppointmentId) {
        await this.highLevelService.cancelAppointment(classItem.highLevelAppointmentId);
      }

      // Actualizar estado en storage
      await storage.updateClass(classId, { status: 'cancelled' });

      // Devolver crédito
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          classCredits: (user.classCredits || 0) + 1
        });
      }

      return { success: true, message: 'Class cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling class:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Obtiene disponibilidad mockeada para desarrollo
   */
  private getMockAvailability(date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`,
        available: Math.random() > 0.3 // 70% disponibilidad
      });
    }

    return slots;
  }

  /**
   * Envía notificaciones de reserva
   */
  private async sendBookingNotifications(user: any, tutor: any, classData: any) {
    if (!this.highLevelService) return;

    try {
      // Notificar al estudiante
      await this.highLevelService.sendCustomMessage(
        user.highLevelContactId,
        `✅ Clase confirmada con ${tutor.name} el ${classData.scheduledAt.toLocaleDateString()} a las ${classData.scheduledAt.toLocaleTimeString()}. Te enviaremos un recordatorio 24h antes.`
      );

      // Notificar al profesor
      await this.highLevelService.sendCustomMessage(
        tutor.highLevelContactId,
        `📚 Nueva clase asignada: ${user.firstName} ${user.lastName} el ${classData.scheduledAt.toLocaleDateString()} a las ${classData.scheduledAt.toLocaleTimeString()}. Especialización: ${tutor.specialization}`
      );
    } catch (error) {
      console.error('Error sending booking notifications:', error);
    }
  }
}