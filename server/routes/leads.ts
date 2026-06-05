import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { emailService } from "../services/email";
import { z } from "zod";

// Human-readable labels for the 4 class types offered on the marketing website
const CLASS_TYPE_LABELS: Record<string, string> = {
  english_adults: "Inglés para adultos",
  english_children: "Inglés para niños",
  spanish_adults: "Español para adultos",
  spanish_children: "Español para niños",
};

const leadSchema = z.object({
  // name/phone are optional so the same endpoint can serve newsletter & discount-popup
  // signups; the booking form enforces them on the website side.
  name: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  classType: z
    .enum(["english_adults", "english_children", "spanish_adults", "spanish_children"])
    .optional(),
  // Fallbacks the website may send instead of classType
  language: z.enum(["english", "spanish"]).optional(),
  audience: z.enum(["adult", "child"]).optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
});

// Shared-secret guard for server-to-server calls coming from the marketing website
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.LEADS_API_KEY;
  if (!expected) {
    console.error("[leads] LEADS_API_KEY not configured — rejecting lead intake request");
    return res.status(503).json({ success: false, message: "Lead intake not configured" });
  }
  const provided = req.header("x-api-key");
  if (provided !== expected) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

export function registerLeadRoutes(app: Express) {
  // Public lead-capture endpoint consumed by the P2F marketing website.
  // Creates/updates a lead in the CRM funnel, records the class request, and notifies the team.
  app.post("/api/public/leads", requireApiKey, async (req: Request, res: Response) => {
    try {
      const data = leadSchema.parse(req.body);

      // Resolve the class type, deriving it from language + audience if needed
      let classType: string | undefined = data.classType;
      if (!classType && data.language && data.audience) {
        const audiencePart = data.audience === "adult" ? "adults" : "children";
        classType = `${data.language}_${audiencePart}`;
      }
      const classLabel = classType
        ? CLASS_TYPE_LABELS[classType] ?? classType
        : "No especificada";

      const rawName = data.name?.trim() || data.email.split("@")[0];
      const [firstName, ...rest] = rawName.split(/\s+/);
      const lastName = rest.join(" ") || "—";
      const phone = data.phone?.trim() || null;
      const source = data.source || "website";

      // 1. Ensure the lead exists in the CRM funnel (users.userType = 'lead'), idempotent by email
      let user = await storage.getUserByEmail(data.email);
      let leadCreated = false;
      if (!user) {
        const base =
          data.email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 20) || "lead";
        const username = `${base}_${randomUUID().slice(0, 8)}`;
        user = await storage.createUser({
          username,
          email: data.email,
          password: randomUUID(), // placeholder; the lead sets a real password if they ever register
          firstName,
          lastName,
          phone,
          userType: "lead",
        } as any);
        leadCreated = true;
      } else if (!user.phone && phone) {
        // Backfill phone on an existing contact if we now have it
        await storage.updateUser(user.id, { phone } as any);
      }

      // 2. Durable record of the specific class request (shows in the contact submissions inbox)
      const submission = await storage.createContactSubmission({
        name: rawName,
        email: data.email,
        phone,
        subject: `Solicitud de clase: ${classLabel}`,
        message: [
          `Tipo de clase: ${classLabel}`,
          data.preferredDate ? `Día preferido: ${data.preferredDate}` : null,
          data.preferredTime ? `Hora preferida: ${data.preferredTime}` : null,
          data.message ? `Mensaje: ${data.message}` : null,
          `Origen: ${source}`,
        ]
          .filter(Boolean)
          .join("\n"),
        preferredContact: "phone",
        status: "new",
      } as any);

      // 3. Subscribe to newsletter (best-effort)
      try {
        await storage.upsertNewsletterSubscriber({
          email: data.email,
          firstName,
          lastName,
          source: "website",
          status: "active",
          userId: user?.id,
        });
      } catch (e) {
        /* ignore newsletter failures */
      }

      // 4. Notify the team at info@ + mateo@ (non-blocking)
      emailService
        .sendLeadNotification({
          name: rawName,
          email: data.email,
          phone: phone || "—",
          classLabel,
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
          message: data.message,
          source,
          isNew: leadCreated,
        })
        .catch((err) => console.error("[leads] Failed to send lead notification:", err));

      res.status(201).json({ success: true, id: submission.id, leadId: user?.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("[leads] Lead intake error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
}
