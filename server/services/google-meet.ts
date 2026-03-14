import { google, calendar_v3 } from "googleapis";
import crypto from "crypto";
import { googleTokenManager } from "./google-token-manager";

interface CreateMeetingParams {
  title: string;
  scheduledAt: Date;
  duration: number; // minutes
  tutorName: string;
  tutorId?: number;
  studentName?: string;
  description?: string;
}

interface MeetingResult {
  meetingLink: string;
  calendarEventId?: string;
  tutorCalendarEventId?: string;
}

class GoogleMeetService {
  private calendar: calendar_v3.Calendar | null = null;
  private calendarId: string = "";
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!email || !privateKey || !calendarId) {
      console.log(
        "[GoogleMeet] Service account not configured, will use Jitsi fallback"
      );
      return;
    }

    try {
      const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      this.calendar = google.calendar({ version: "v3", auth });
      this.calendarId = calendarId;
      this.initialized = true;
      console.log("[GoogleMeet] Service account initialized successfully");
    } catch (error) {
      console.error("[GoogleMeet] Failed to initialize:", error);
    }
  }

  private buildEventBody(params: CreateMeetingParams) {
    const endTime = new Date(
      params.scheduledAt.getTime() + params.duration * 60 * 1000
    );
    return {
      summary: params.title,
      description:
        params.description ||
        `Class with ${params.tutorName}${params.studentName ? ` and ${params.studentName}` : ""}`,
      start: { dateTime: params.scheduledAt.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };
  }

  private extractMeetLink(event: calendar_v3.Schema$Event): string | undefined {
    return event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri || undefined;
  }

  async createMeetingLink(params: CreateMeetingParams): Promise<MeetingResult> {
    // Try tutor's personal calendar first (OAuth)
    if (params.tutorId) {
      const tutorResult = await this.createInTutorCalendar(params);
      if (tutorResult) {
        // Also create in admin shared calendar (fire and forget)
        const adminResult = await this.createInAdminCalendar(params);
        return {
          meetingLink: tutorResult.meetingLink,
          tutorCalendarEventId: tutorResult.eventId,
          calendarEventId: adminResult?.eventId,
        };
      }
    }

    // Fallback: service account shared calendar
    const adminResult = await this.createInAdminCalendar(params);
    if (adminResult) {
      return {
        meetingLink: adminResult.meetingLink,
        calendarEventId: adminResult.eventId,
      };
    }

    // Final fallback: Jitsi
    return { meetingLink: this.generateJitsiFallback(params.tutorName) };
  }

  private async createInTutorCalendar(
    params: CreateMeetingParams
  ): Promise<{ meetingLink: string; eventId: string } | null> {
    if (!params.tutorId) return null;

    try {
      const authClient = await googleTokenManager.getAuthClientForTutor(params.tutorId);
      if (!authClient) return null;

      const tutorCalendar = google.calendar({ version: "v3", auth: authClient });
      const calendarId = await googleTokenManager.getTutorCalendarId(params.tutorId);

      const event = await tutorCalendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: this.buildEventBody(params),
      });

      const meetLink = this.extractMeetLink(event.data);
      if (!meetLink) {
        console.error("[GoogleMeet] No Meet link from tutor calendar");
        return null;
      }

      return { meetingLink: meetLink, eventId: event.data.id! };
    } catch (error) {
      console.error("[GoogleMeet] Error creating in tutor calendar:", error);
      return null;
    }
  }

  private async createInAdminCalendar(
    params: CreateMeetingParams
  ): Promise<{ meetingLink: string; eventId: string } | null> {
    if (!this.initialized || !this.calendar) return null;

    try {
      const event = await this.calendar.events.insert({
        calendarId: this.calendarId,
        conferenceDataVersion: 1,
        requestBody: this.buildEventBody(params),
      });

      const meetLink = this.extractMeetLink(event.data);
      if (!meetLink) {
        console.error("[GoogleMeet] No Meet link from admin calendar");
        return null;
      }

      return { meetingLink: meetLink, eventId: event.data.id! };
    } catch (error) {
      console.error("[GoogleMeet] Error creating in admin calendar:", error);
      return null;
    }
  }

  async deleteCalendarEvent(
    calendarEventId: string,
    tutorCalendarEventId?: string,
    tutorId?: number
  ): Promise<void> {
    // Delete from admin calendar
    if (this.initialized && this.calendar && calendarEventId) {
      try {
        await this.calendar.events.delete({
          calendarId: this.calendarId,
          eventId: calendarEventId,
        });
      } catch (error) {
        console.error("[GoogleMeet] Error deleting admin event:", error);
      }
    }

    // Delete from tutor's personal calendar
    if (tutorCalendarEventId && tutorId) {
      try {
        const authClient = await googleTokenManager.getAuthClientForTutor(tutorId);
        if (authClient) {
          const tutorCalendar = google.calendar({ version: "v3", auth: authClient });
          const calendarId = await googleTokenManager.getTutorCalendarId(tutorId);
          await tutorCalendar.events.delete({
            calendarId,
            eventId: tutorCalendarEventId,
          });
        }
      } catch (error) {
        console.error("[GoogleMeet] Error deleting tutor event:", error);
      }
    }
  }

  async updateCalendarEvent(
    calendarEventId: string,
    newScheduledAt: Date,
    duration: number,
    tutorCalendarEventId?: string,
    tutorId?: number
  ): Promise<void> {
    const endTime = new Date(newScheduledAt.getTime() + duration * 60 * 1000);
    const patchBody = {
      start: { dateTime: newScheduledAt.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
    };

    // Update admin calendar
    if (this.initialized && this.calendar && calendarEventId) {
      try {
        await this.calendar.events.patch({
          calendarId: this.calendarId,
          eventId: calendarEventId,
          requestBody: patchBody,
        });
      } catch (error) {
        console.error("[GoogleMeet] Error updating admin event:", error);
      }
    }

    // Update tutor's personal calendar
    if (tutorCalendarEventId && tutorId) {
      try {
        const authClient = await googleTokenManager.getAuthClientForTutor(tutorId);
        if (authClient) {
          const tutorCalendar = google.calendar({ version: "v3", auth: authClient });
          const calId = await googleTokenManager.getTutorCalendarId(tutorId);
          await tutorCalendar.events.patch({
            calendarId: calId,
            eventId: tutorCalendarEventId,
            requestBody: patchBody,
          });
        }
      } catch (error) {
        console.error("[GoogleMeet] Error updating tutor event:", error);
      }
    }
  }

  private generateJitsiFallback(tutorName: string): string {
    const hash = crypto.randomBytes(4).toString("hex");
    const safeName = tutorName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    return `https://meet.jit.si/P2F-${safeName}-${hash}`;
  }
}

export const googleMeetService = new GoogleMeetService();
