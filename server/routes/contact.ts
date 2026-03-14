import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  level: z.string().optional(),
  subject: z.string().min(2),
  message: z.string().min(10),
  preferredContact: z.string().optional(),
});

export function registerContactRoutes(app: Express) {
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const validated = contactSchema.parse(req.body);

      const submission = await storage.createContactSubmission({
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        level: validated.level || null,
        subject: validated.subject,
        message: validated.message,
        preferredContact: validated.preferredContact || null,
        status: "new",
      });

      // Auto-subscribe to newsletter
      try {
        const [firstName, ...rest] = validated.name.split(" ");
        await storage.upsertNewsletterSubscriber({
          email: validated.email,
          firstName,
          lastName: rest.join(" ") || undefined,
          source: "contact_form",
          status: "active",
        });
      } catch (e) { /* ignore */ }

      res.status(201).json({
        success: true,
        message: "Contact submission received",
        id: submission.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
      }
      console.error("Contact submission error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });
}
