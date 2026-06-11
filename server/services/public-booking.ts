import { randomUUID } from 'crypto';
import { formatInTimeZone } from 'date-fns-tz';
import { es, enUS } from 'date-fns/locale';
import { storage } from '../storage';
import { availabilityService, localSlotToUtc, tutorTimezone, APP_TIMEZONE } from './availability';
import { googleMeetService } from './google-meet';
import { emailService } from './email';
import type { Tutor } from '@shared/schema';

const TRIAL_DURATION_MIN = 50;
const LEAD_TIME_MS = 60 * 60 * 1000; // require ≥1h before the slot

export type Audience = 'adults' | 'kids';
export type Language = 'spanish' | 'english';

/** Maps the website's 4-combo class type to the tutor model's (audience, language). */
export function resolveClassType(
  classType?: string,
  language?: string,
  audience?: string,
): { audience: Audience; language: Language; label: string } | null {
  const map: Record<string, { audience: Audience; language: Language; label: string }> = {
    english_adults: { audience: 'adults', language: 'english', label: 'Inglés para adultos' },
    english_children: { audience: 'kids', language: 'english', label: 'Inglés para niños' },
    spanish_adults: { audience: 'adults', language: 'spanish', label: 'Español para adultos' },
    spanish_children: { audience: 'kids', language: 'spanish', label: 'Español para niños' },
  };
  if (classType && map[classType]) return map[classType];
  // Fallback: derive from language + audience
  if (language && audience) {
    const aud: Audience = audience === 'adult' || audience === 'adults' ? 'adults' : 'kids';
    const lang: Language = language === 'english' ? 'english' : 'spanish';
    const key = `${lang}_${aud === 'adults' ? 'adults' : 'children'}`;
    return map[key] || null;
  }
  return null;
}

export interface AggregatedSlot {
  /** absolute UTC instant, ISO string */
  start: string;
  end: string;
}

/**
 * Union of available slots across all active tutors that teach the given class type,
 * for a single calendar date. Returns absolute UTC instants (the website renders them
 * in the visitor's timezone). Slots within the lead-time window are dropped.
 */
export async function getAggregatedAvailability(params: {
  audience: Audience;
  language: Language;
  dateStr: string;
}): Promise<AggregatedSlot[]> {
  const { audience, language, dateStr } = params;
  const tutors = await storage.getTutorsByCategory(audience, language); // active only
  const minStart = Date.now() + LEAD_TIME_MS;
  const byStart = new Map<string, string>(); // start ISO -> end ISO

  for (const tutor of tutors) {
    const tz = tutorTimezone(tutor);
    let slots: { start: string; end: string; available: boolean }[] = [];
    try {
      slots = await availabilityService.getAvailableSlots(tutor.id, dateStr);
    } catch {
      slots = [];
    }
    for (const s of slots) {
      if (!s.available) continue;
      const startUtc = localSlotToUtc(dateStr, s.start, tz);
      if (startUtc.getTime() < minStart) continue;
      const endUtc = localSlotToUtc(dateStr, s.end, tz);
      byStart.set(startUtc.toISOString(), endUtc.toISOString());
    }
  }

  return Array.from(byStart.entries())
    .map(([start, end]) => ({ start, end }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Availability across a range of consecutive calendar dates (used by the website calendar). */
export async function getAggregatedAvailabilityRange(params: {
  audience: Audience;
  language: Language;
  startDateStr: string;
  days: number;
}): Promise<{ date: string; slots: AggregatedSlot[] }[]> {
  const { audience, language, startDateStr, days } = params;
  const result: { date: string; slots: AggregatedSlot[] }[] = [];
  const base = new Date(`${startDateStr}T00:00:00Z`);
  for (let d = 0; d < Math.min(days, 14); d++) {
    const day = new Date(base);
    day.setUTCDate(base.getUTCDate() + d);
    const dateStr = day.toISOString().split('T')[0];
    const slots = await getAggregatedAvailability({ audience, language, dateStr });
    result.push({ date: dateStr, slots });
  }
  return result;
}

/** Upserts a lead/trial user from website contact info (idempotent by email). */
async function upsertTrialUser(name: string, email: string, phone?: string) {
  const rawName = name?.trim() || email.split('@')[0];
  const [firstName, ...rest] = rawName.split(/\s+/);
  const lastName = rest.join(' ') || '—';
  let user = await storage.getUserByEmail(email);
  if (!user) {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 20) || 'lead';
    user = await storage.createUser({
      username: `${base}_${randomUUID().slice(0, 8)}`,
      email,
      password: randomUUID(),
      firstName,
      lastName,
      phone: phone || null,
      userType: 'trial',
    } as any);
  } else if (!user.phone && phone) {
    await storage.updateUser(user.id, { phone } as any);
  }
  return { user, firstName };
}

function isUniqueViolation(err: any): boolean {
  return err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message || '');
}

export interface TrialBookingResult {
  success: boolean;
  code?: 'no_availability' | 'slot_taken' | 'invalid' | 'error';
  classId?: number;
  meetingLink?: string;
  scheduledAt?: string;
  tutorName?: string;
  message?: string;
}

/**
 * Books a free trial class from the public website with NO login:
 *  - upserts a lead/trial user
 *  - picks the least-loaded available coach matching the class type
 *  - creates the trial class (no credit deduction), generates a meeting link
 *  - notifies student, coach, and the team
 * Auto-retries with the next coach if a slot was taken concurrently (unique-index guard).
 */
export async function bookTrialAuto(params: {
  name: string;
  email: string;
  phone?: string;
  audience: Audience;
  language: Language;
  classLabel: string;
  startAtISO: string;
  /** visitor timezone for formatting their confirmation email; falls back to APP_TIMEZONE */
  timeZone?: string;
  /** visitor UI language for their confirmation email */
  lang?: 'es' | 'en';
}): Promise<TrialBookingResult> {
  const startUtc = new Date(params.startAtISO);
  if (isNaN(startUtc.getTime())) return { success: false, code: 'invalid', message: 'Invalid start time' };
  if (startUtc.getTime() < Date.now() + LEAD_TIME_MS) {
    return { success: false, code: 'invalid', message: 'Slot is in the past or too soon' };
  }

  // Candidate coaches: teach this class type AND are available at this instant
  const tutors = await storage.getTutorsByCategory(params.audience, params.language);
  const candidates: { tutor: Tutor; load: number }[] = [];
  for (const tutor of tutors) {
    const v = await availabilityService.validateBooking(tutor.id, startUtc, TRIAL_DURATION_MIN);
    if (!v.valid) continue;
    const load = (await storage.getTutorClassesForDate(tutor.id, startUtc)).length;
    candidates.push({ tutor, load });
  }
  if (candidates.length === 0) return { success: false, code: 'no_availability' };

  // Least-loaded first
  candidates.sort((a, b) => a.load - b.load);

  // Create the lead/trial user lazily — only once we're actually about to book a class,
  // so a fully-raced-out attempt doesn't leave an orphan account.
  let account: { user: Awaited<ReturnType<typeof storage.getUserByEmail>>; firstName: string } | null = null;

  for (const { tutor } of candidates) {
    // Re-validate just before booking (slot may have been taken)
    const v = await availabilityService.validateBooking(tutor.id, startUtc, TRIAL_DURATION_MIN);
    if (!v.valid) continue;

    if (!account) account = await upsertTrialUser(params.name, params.email, params.phone);
    const user = account.user!;
    const firstName = account.firstName;

    const tutorLang: Language = tutor.languageTaught?.includes('english') ? 'english' : 'spanish';
    const title = `${tutorLang === 'english' ? 'English' : 'Spanish'} Trial Class - ${tutor.name}`;

    let meetingLink: string | null = null;
    let calendarEventId: string | null = null;
    let tutorCalendarEventId: string | null = null;
    try {
      const meet = await googleMeetService.createMeetingLink({
        title,
        scheduledAt: startUtc,
        duration: TRIAL_DURATION_MIN,
        tutorName: tutor.name,
        tutorId: tutor.id,
        studentName: firstName,
      });
      meetingLink = meet.meetingLink || null;
      calendarEventId = meet.calendarEventId || null;
      tutorCalendarEventId = meet.tutorCalendarEventId || null;
    } catch (e) {
      console.warn('[public-booking] meeting link creation failed, continuing without link:', e);
    }

    let newClass;
    try {
      newClass = await storage.createClass({
        userId: user.id,
        tutorId: tutor.id,
        title,
        scheduledAt: startUtc,
        duration: TRIAL_DURATION_MIN,
        status: 'scheduled' as const,
        isTrial: true,
        classCategory: `${params.audience}-${params.language}`,
        meetingLink,
        calendarEventId,
        tutorCalendarEventId,
      } as any);
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Slot got taken concurrently — try the next coach
        if (calendarEventId || tutorCalendarEventId) {
          googleMeetService.deleteCalendarEvent(calendarEventId || '', tutorCalendarEventId || undefined, tutor.id).catch(() => {});
        }
        continue;
      }
      console.error('[public-booking] createClass failed:', err);
      return { success: false, code: 'error', message: 'Could not create the class' };
    }

    // Mark trial usage on the user
    await storage.updateUser(user.id, { trialTutorId: tutor.id, trialStartedAt: new Date() } as any).catch(() => {});

    // Notifications — TZ-correct, localized emails (student in their zone/lang, coach in theirs, team to info@/mateo@)
    const studentLang: 'es' | 'en' = params.lang === 'en' ? 'en' : 'es';
    const studentLocale = studentLang === 'en' ? enUS : es;
    const tz = tutor.timezone || APP_TIMEZONE;
    const studentTz = params.timeZone || tz;
    const dateStudent = formatInTimeZone(startUtc, studentTz, 'EEEE d MMM yyyy', { locale: studentLocale });
    const timeStudent = formatInTimeZone(startUtc, studentTz, 'HH:mm');
    const dateTutor = formatInTimeZone(startUtc, tz, 'EEEE d MMM yyyy', { locale: es });
    const timeTutor = formatInTimeZone(startUtc, tz, 'HH:mm');

    emailService.sendBookingConfirmation({
      to: params.email,
      studentName: firstName,
      tutorName: tutor.name,
      date: dateStudent,
      time: `${timeStudent} (${studentTz})`,
      meetingLink: meetingLink || undefined,
      lang: studentLang,
    }).catch((e) => console.error('[public-booking] student email failed:', e));

    if (tutor.email) {
      emailService.sendTutorNewBooking({
        to: tutor.email,
        tutorName: tutor.name,
        studentName: `${firstName} (${params.email}${params.phone ? ', ' + params.phone : ''})`,
        date: dateTutor,
        time: `${timeTutor} (${tz})`,
        lang: 'es',
      }).catch((e) => console.error('[public-booking] tutor email failed:', e));
    }

    emailService.sendTrialBookingNotification({
      name: params.name,
      email: params.email,
      phone: params.phone || '—',
      classLabel: params.classLabel,
      tutorName: tutor.name,
      date: dateTutor,
      time: `${timeTutor} (${tz})`,
    }).catch((e) => console.error('[public-booking] team email failed:', e));

    return {
      success: true,
      classId: newClass.id,
      meetingLink: meetingLink || undefined,
      scheduledAt: startUtc.toISOString(),
      tutorName: tutor.name,
    };
  }

  // Every candidate slot got taken in the race
  return { success: false, code: 'slot_taken' };
}
