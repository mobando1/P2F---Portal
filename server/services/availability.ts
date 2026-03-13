import { storage } from '../storage';

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  available: boolean;
}

/**
 * AvailabilityService — Motor de disponibilidad real
 * Reemplaza getMockAvailability() con datos de la base de datos.
 *
 * Combina:
 * 1. Disponibilidad recurrente semanal (tutor_availability)
 * 2. Excepciones del día (tutor_availability_exceptions)
 * 3. Clases ya agendadas (classes con status='scheduled')
 */
export class AvailabilityService {
  /**
   * Obtiene los slots disponibles para un tutor en una fecha específica
   */
  async getAvailableSlots(tutorId: number, dateStr: string): Promise<TimeSlot[]> {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...

    // 1. Get recurring weekly availability for this day of week
    const weeklySlots = await storage.getTutorAvailability(tutorId);
    const daySlots = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);

    if (daySlots.length === 0) {
      return []; // Tutor not available on this day
    }

    // 2. Check for exceptions on this specific date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const exceptions = await storage.getTutorExceptions(tutorId, startOfDay, endOfDay);

    // If entire day is blocked
    const fullDayBlock = exceptions.find(e => e.isBlocked && !e.startTime);
    if (fullDayBlock) {
      return [];
    }

    // 3. Get existing booked classes for this date
    const bookedClasses = await storage.getTutorClassesForDate(tutorId, date);

    // 4. Generate time slots from availability windows
    const allSlots: TimeSlot[] = [];

    for (const daySlot of daySlots) {
      const startMinutes = timeToMinutes(daySlot.startTime);
      const endMinutes = timeToMinutes(daySlot.endTime);

      // Generate 60-minute slots
      for (let min = startMinutes; min + 60 <= endMinutes; min += 60) {
        const slotStart = minutesToTime(min);
        const slotEnd = minutesToTime(min + 60);

        // Check if this slot is blocked by an exception
        const isExceptionBlocked = exceptions.some(e => {
          if (!e.isBlocked || !e.startTime || !e.endTime) return false;
          const excStart = timeToMinutes(e.startTime);
          const excEnd = timeToMinutes(e.endTime);
          return min < excEnd && min + 60 > excStart;
        });

        // Check if this slot conflicts with an existing booking
        const isBooked = bookedClasses.some(c => {
          const classStart = new Date(c.scheduledAt);
          const classStartMin = classStart.getHours() * 60 + classStart.getMinutes();
          const classEndMin = classStartMin + (c.duration || 60);
          return min < classEndMin && min + 60 > classStartMin;
        });

        allSlots.push({
          start: slotStart,
          end: slotEnd,
          available: !isExceptionBlocked && !isBooked,
        });
      }
    }

    return allSlots;
  }

  /**
   * Validates whether a booking is possible for the given tutor/time
   */
  async validateBooking(
    tutorId: number,
    scheduledAt: Date,
    duration: number = 60
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. Check tutor exists and is active
    const tutor = await storage.getTutor(tutorId);
    if (!tutor || !tutor.isActive) {
      return { valid: false, reason: 'Tutor not found or inactive' };
    }

    // 2. Check if the time is in the future
    if (scheduledAt <= new Date()) {
      return { valid: false, reason: 'Cannot book a class in the past' };
    }

    // 3. Check weekly availability for this day of week
    const dayOfWeek = scheduledAt.getDay();
    const weeklySlots = await storage.getTutorAvailability(tutorId);
    const daySlots = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);

    if (daySlots.length === 0) {
      return { valid: false, reason: 'Tutor is not available on this day' };
    }

    // 4. Check if the requested time falls within an availability window
    const requestedStartMin = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const requestedEndMin = requestedStartMin + duration;

    const withinAvailability = daySlots.some(slot => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      return requestedStartMin >= slotStart && requestedEndMin <= slotEnd;
    });

    if (!withinAvailability) {
      return { valid: false, reason: 'Requested time is outside tutor availability' };
    }

    // 5. Check for exceptions on this date
    const startOfDay = new Date(scheduledAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledAt);
    endOfDay.setHours(23, 59, 59, 999);
    const exceptions = await storage.getTutorExceptions(tutorId, startOfDay, endOfDay);

    // Full day block
    const fullDayBlock = exceptions.find(e => e.isBlocked && !e.startTime);
    if (fullDayBlock) {
      return { valid: false, reason: `Tutor unavailable: ${fullDayBlock.reason || 'Day blocked'}` };
    }

    // Partial block overlapping requested time
    const partialBlock = exceptions.find(e => {
      if (!e.isBlocked || !e.startTime || !e.endTime) return false;
      const excStart = timeToMinutes(e.startTime);
      const excEnd = timeToMinutes(e.endTime);
      return requestedStartMin < excEnd && requestedEndMin > excStart;
    });

    if (partialBlock) {
      return { valid: false, reason: `Tutor unavailable during this time: ${partialBlock.reason || 'Time blocked'}` };
    }

    // 6. Check for conflicts with existing bookings
    const hasConflict = await storage.checkConflict(tutorId, scheduledAt, duration);
    if (hasConflict) {
      return { valid: false, reason: 'Time slot already booked' };
    }

    return { valid: true };
  }
}

/** Convert "HH:MM" to total minutes */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/** Convert total minutes to "HH:MM" */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Singleton
export const availabilityService = new AvailabilityService();
