import { z } from "zod";

/**
 * The qualification answers the marketing website collects at booking time.
 *
 * Before this, the booking form captured name/email/phone and nothing else, so
 * the coach walked into the diagnostic class knowing nothing about the student.
 * These four answers are read by the coach BEFORE the class and feed the study
 * plan generator afterwards.
 *
 * CONTRACT NOTES
 * - Values are STABLE MACHINE CODES, never localized labels. The website sends
 *   `goalCategory: "work"`, not "Mi trabajo o mi carrera" — so the coach
 *   briefing can render in the coach's language regardless of what the visitor
 *   saw. `locale` + `version` keep old rows decodable after an option set
 *   changes.
 * - Every field is optional, and `bookSchema.parse()` already strips unknown
 *   keys, so a payload from the CURRENT production website (which sends no
 *   intake at all) validates identically before and after this change. That is
 *   the deploy gate: verify it before shipping anything else.
 * - `.passthrough()` is load-bearing. Without it zod strips the extra keys
 *   before we can persist them into `intake_responses.raw`, which is the whole
 *   point of that column — the website can add a fifth question and it lands
 *   there with no Portal deploy.
 */

export const INTAKE_SCHEMA_VERSION = 1;

export const intakeSchema = z
  .object({
    version: z.number().int().optional(),
    goalCategory: z
      .enum(["work", "travel", "relocate", "study", "family", "other"])
      .optional()
      .or(z.literal("")),
    /** Free text, verbatim. Quoted back in the plan and the delivery email — never normalized. */
    goal: z.string().trim().max(1000).optional(),
    blocker: z
      .enum(["listening", "word_recall", "pronunciation", "grammar", "fear", "unsure"])
      .optional()
      .or(z.literal("")),
    deadline: z
      .enum(["asap", "1_3_months", "3_6_months", "6_12_months", "no_deadline"])
      .optional()
      .or(z.literal("")),
    deadlineNote: z.string().trim().max(300).optional(),
    /** Self-assessed, from plain-language options — not a test result. */
    selfLevel: z.enum(["none", "a1", "a2", "b1", "b2", "c1"]).optional().or(z.literal("")),
    weeklyTime: z.enum(["1_2h", "3_4h", "5_plus"]).optional().or(z.literal("")),
    locale: z.enum(["es", "en"]).optional(),
    audience: z.enum(["adult", "child"]).optional(),
  })
  .passthrough();

export type IntakePayload = z.infer<typeof intakeSchema>;

/**
 * Recording consent captured on the website booking form.
 *
 * Google Meet announces recording in-call, but that is a notification, not an
 * auditable record. This is the record — it lands in `recording_consents`,
 * which is append-only at the DB level.
 */
export const consentSchema = z.object({
  recording: z.literal(true),
  policyVersion: z.string().max(40),
  acceptedAt: z.string().datetime().optional(),
  /** The request reaches us from the WEBSITE's server, so the visitor's IP must be forwarded explicitly or the audit trail records the proxy. */
  clientIp: z.string().max(64).optional(),
  userAgent: z.string().max(500).optional(),
  /** Required for kids classes — see the hard block in transcripts.ts. */
  guardianName: z.string().max(120).optional(),
  guardianEmail: z.string().email().optional(),
});

export type ConsentPayload = z.infer<typeof consentSchema>;
