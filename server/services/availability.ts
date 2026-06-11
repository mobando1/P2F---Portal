import { storage } from '../storage';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  available: boolean;
}

/** Canonical business timezone used when a tutor has no explicit timezone set */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/New_York';

/** Timezone in which a tutor's HH:MM availability is expressed */
export function tutorTimezone(tutor?: { timezone?: string | null } | null): string {
  return tutor?.timezone || APP_TIMEZONE;
}

/** Weekday (0=Sun..6=Sat) of a calendar date string "YYYY-MM-DD", server-timezone-independent */
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Convert a local wall-clock (dateStr "YYYY-MM-DD", "HH:MM") in a timezone to an absolute UTC Date */
export function localSlotToUtc(dateStr: string, hhmm: string, timeZone: string): Date {
  return fromZonedTime(`${dateStr}T${hhmm}:00`, timeZone);
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
    const date = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = weekdayOf(dateStr); // 0=Sun, 1=Mon, ... (calendar weekday of dateStr)

    // Safe query wrapper — tolerates missing tables
    const safe = <T>(fn: () => Promise<T>, fallback: T): Promise<T> =>
      fn().catch(err => { console.warn("[availability] query failed:", err.message); return fallback; });

    // Tutor timezone — availability HH:MM is expressed in the tutor's local time
    const tutor = await safe(() => storage.getTutor(tutorId), undefined as any);
    const tz = tutorTimezone(tutor);

    // 1. Get recurring weekly availability for this day of week
    const weeklySlots = await safe(() => storage.getTutorAvailability(tutorId), []);
    const daySlots = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);

    if (daySlots.length === 0) {
      if (weeklySlots.length === 0) {
        console.log(`[availability] Tutor ${tutorId}: NO recurring slots in DB at all`);
      } else {
        console.log(`[availability] Tutor ${tutorId}: has ${weeklySlots.length} slots but none for dayOfWeek=${dayOfWeek} (date=${dateStr})`);
      }
      return [];
    }

    // 2. Check for exceptions on this specific date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const exceptions = await safe(() => storage.getTutorExceptions(tutorId, startOfDay, endOfDay), []);

    // If entire day is blocked
    const fullDayBlock = exceptions.find(e => e.isBlocked && !e.startTime);
    if (fullDayBlock) {
      return [];
    }

    // 3. Get existing booked classes. Fetch a ±1 day UTC window because a class on the
    // tutor's LOCAL calendar day can land on an adjacent UTC day for non-UTC timezones.
    const dayMs = 86_400_000;
    const [cPrev, cCur, cNext] = await Promise.all([
      safe(() => storage.getTutorClassesForDate(tutorId, new Date(date.getTime() - dayMs)), []),
      safe(() => storage.getTutorClassesForDate(tutorId, date), []),
      safe(() => storage.getTutorClassesForDate(tutorId, new Date(date.getTime() + dayMs)), []),
    ]);
    const bookedClasses = [...cPrev, ...cCur, ...cNext];

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

        // Check if this slot conflicts with an existing booking.
        // Convert each booked class's absolute time to the tutor's local wall-clock and
        // only compare classes that actually fall on this local calendar day.
        const isBooked = bookedClasses.some(c => {
          const local = toZonedTime(new Date(c.scheduledAt), tz);
          const cDateStr = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
          if (cDateStr !== dateStr) return false;
          const classStartMin = local.getHours() * 60 + local.getMinutes();
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

    // Safe query wrapper
    const safe = <T>(fn: () => Promise<T>, fallback: T): Promise<T> =>
      fn().catch(err => { console.warn("[availability/validate] query failed:", err.message); return fallback; });

    // Interpret the absolute instant in the tutor's local timezone for day/window checks
    const tz = tutorTimezone(tutor);
    const local = toZonedTime(scheduledAt, tz);

    // 3. Check weekly availability for this day of week (tutor-local)
    const dayOfWeek = local.getDay();
    const weeklySlots = await safe(() => storage.getTutorAvailability(tutorId), []);
    const daySlots = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);

    if (daySlots.length === 0) {
      return { valid: false, reason: 'Tutor is not available on this day' };
    }

    // 4. Check if the requested time falls within an availability window (tutor-local minutes)
    const requestedStartMin = local.getHours() * 60 + local.getMinutes();
    const requestedEndMin = requestedStartMin + duration;

    const withinAvailability = daySlots.some(slot => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      return requestedStartMin >= slotStart && requestedEndMin <= slotEnd;
    });

    if (!withinAvailability) {
      return { valid: false, reason: 'Requested time is outside tutor availability' };
    }

    // 5. Check for exceptions on this date (tutor-local calendar day)
    const localDateStr = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
    const startOfDay = new Date(`${localDateStr}T00:00:00Z`);
    const endOfDay = new Date(`${localDateStr}T23:59:59Z`);
    const exceptions = await safe(() => storage.getTutorExceptions(tutorId, startOfDay, endOfDay), []);

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
