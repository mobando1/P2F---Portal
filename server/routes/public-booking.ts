import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKey";
import {
  resolveClassType,
  getAggregatedAvailability,
  getAggregatedAvailabilityRange,
  bookTrialAuto,
} from "../services/public-booking";

export function registerPublicBookingRoutes(app: Express) {
  // Aggregated availability for a class type — single date (?date=) or range (?startDate=&days=)
  app.get("/api/public/availability", requireApiKey, async (req: Request, res: Response) => {
    const { classType, language, audience, date, startDate, days } = req.query;
    const resolved = resolveClassType(
      classType as string | undefined,
      language as string | undefined,
      audience as string | undefined,
    );
    if (!resolved) {
      return res.status(400).json({ success: false, message: "Invalid or missing class type" });
    }

    try {
      if (startDate) {
        const data = await getAggregatedAvailabilityRange({
          audience: resolved.audience,
          language: resolved.language,
          startDateStr: String(startDate),
          days: days ? Math.max(1, Math.min(14, parseInt(String(days), 10) || 7)) : 7,
        });
        return res.json({ success: true, classLabel: resolved.label, days: data });
      }
      if (!date) {
        return res.status(400).json({ success: false, message: "date or startDate is required" });
      }
      const slots = await getAggregatedAvailability({
        audience: resolved.audience,
        language: resolved.language,
        dateStr: String(date),
      });
      res.json({ success: true, classLabel: resolved.label, date: String(date), slots });
    } catch (e) {
      console.error("[public/availability] error:", e);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  const bookSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(3),
    classType: z.string().optional(),
    language: z.string().optional(),
    audience: z.string().optional(),
    startAt: z.string(), // absolute ISO instant chosen by the visitor
    timeZone: z.string().optional(), // visitor timezone for their confirmation email
    lang: z.enum(["es", "en"]).optional(), // visitor UI language for their confirmation email
  });

  app.post("/api/public/trial-bookings", requireApiKey, async (req: Request, res: Response) => {
    try {
      const data = bookSchema.parse(req.body);
      const resolved = resolveClassType(data.classType, data.language, data.audience);
      if (!resolved) {
        return res.status(400).json({ success: false, message: "Invalid or missing class type" });
      }

      const result = await bookTrialAuto({
        name: data.name,
        email: data.email,
        phone: data.phone,
        audience: resolved.audience,
        language: resolved.language,
        classLabel: resolved.label,
        startAtISO: data.startAt,
        timeZone: data.timeZone,
        lang: data.lang,
      });

      if (result.success) {
        return res.status(201).json({
          success: true,
          classId: result.classId,
          scheduledAt: result.scheduledAt,
          tutorName: result.tutorName,
          meetingLink: result.meetingLink,
        });
      }

      const status = result.code === "no_availability" || result.code === "slot_taken" ? 409 : 400;
      res.status(status).json({ success: false, code: result.code, message: result.message || "Could not book the class" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
      }
      console.error("[public/trial-bookings] error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
}
