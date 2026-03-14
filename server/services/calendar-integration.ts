import { storage } from '../storage';
import { availabilityService, type TimeSlot } from './availability';
import { notificationService } from './notification';
import { googleMeetService } from './google-meet';

export type { TimeSlot };

export interface CalendarAvailability {
  tutorId: number;
  date: string;
  slots: TimeSlot[];
}

export class CalendarIntegrationService {
  /**
   * Obtiene disponibilidad de un profesor específico para una fecha
   * Usa el AvailabilityService con datos reales de la BD
   */
  async getTutorAvailability(tutorId: number, date: string): Promise<TimeSlot[]> {
    try {
      return await availabilityService.getAvailableSlots(tutorId, date);
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
   * Valida disponibilidad y conflictos antes de crear
   */
  async bookClassWithTutor(
    userId: number,
    tutorId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ success: boolean; classId?: number; meetingLink?: string; message?: string }> {
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

      const scheduledAt = new Date(`${date}T${startTime}`);
      const duration = 60;

      // Validar disponibilidad y conflictos
      const validation = await availabilityService.validateBooking(tutorId, scheduledAt, duration);
      if (!validation.valid) {
        return { success: false, message: validation.reason };
      }

      // Generar link de videollamada (Google Meet con fallback a Jitsi)
      const title = `${tutor.languageTaught === 'spanish' ? 'Spanish' : 'English'} Class - ${tutor.name}`;
      const { meetingLink, calendarEventId, tutorCalendarEventId } = await googleMeetService.createMeetingLink({
        title,
        scheduledAt,
        duration,
        tutorName: tutor.name,
        tutorId,
        studentName: user.firstName || undefined,
      });

      // Crear clase en storage
      const classData = {
        userId,
        tutorId,
        title,
        scheduledAt,
        duration,
        status: 'scheduled' as const,
        meetingLink,
        calendarEventId: calendarEventId || null,
        tutorCalendarEventId: tutorCalendarEventId || null,
      };

      const newClass = await storage.createClass(classData);

      // Reducir créditos
      await storage.updateUser(userId, {
        classCredits: user.classCredits - 1
      });

      // Send notifications
      notificationService.onClassBooked({
        studentId: userId,
        tutorId,
        classId: newClass.id,
        scheduledAt,
        meetingLink,
      });

      return {
        success: true,
        classId: newClass.id,
        meetingLink,
        message: 'Class booked successfully'
      };
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
      const allClasses = await storage.getAllClasses();
      const classItem = allClasses.find(cl => cl.id === classId);

      if (!classItem || classItem.userId !== userId) {
        return { success: false, message: 'Class not found or not authorized' };
      }

      if (classItem.status === 'cancelled') {
        return { success: false, message: 'Class already cancelled' };
      }

      // Verificar que la clase no sea en las próximas 12 horas
      const now = new Date();
      const classDate = new Date(classItem.scheduledAt);
      const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 12) {
        return { success: false, message: 'Cannot cancel class within 12 hours' };
      }

      // Actualizar estado en storage
      await storage.updateClass(classId, { status: 'cancelled' });

      // Delete Google Calendar events if they exist
      if (classItem.calendarEventId || classItem.tutorCalendarEventId) {
        googleMeetService.deleteCalendarEvent(
          classItem.calendarEventId || "",
          classItem.tutorCalendarEventId || undefined,
          classItem.tutorId
        ).catch(() => {});
      }

      // Devolver crédito
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          classCredits: (user.classCredits || 0) + 1
        });
      }

      // Send notifications
      notificationService.onClassCancelled({
        studentId: userId,
        tutorId: classItem.tutorId,
        scheduledAt: classDate,
      });

      return { success: true, message: 'Class cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling class:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

}
