import { z } from "zod";

/**
 * The Flight Plan / Plan de Vuelo — the artifact the student receives free
 * within 72 hours of their diagnostic class, whether or not they enroll.
 *
 * Shared between server and client so the renderer is typed from the same
 * source that constrains the model.
 *
 * TWO FIELDS CARRY THE WHOLE BUSINESS MODEL:
 *
 *   `weeklyOutline[].milestone` — must be first-person, observable and BINARY.
 *     "Puedo abrir la reunión del lunes y presentar tres puntos sin leer notas."
 *     not "Mejorar la fluidez en contextos profesionales."
 *     This is the difference between a plan that gets read and one that gets
 *     executed, and it's why the student can check items off.
 *
 *   `recommendation.planTier` — an enum so the model cannot invent a fourth
 *     tier. It maps to SUBSCRIPTION_PLANS, which is what turns the price from a
 *     decision the student makes into a consequence of the diagnosis.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const studyPlanSchema = z.object({
  /** The plan's NAME, e.g. "Plan de Vuelo — Reuniones en Inglés". Rendered as the page title. */
  headline: z.string().max(120),

  diagnosis: z.object({
    cefrLevel: z.enum(CEFR_LEVELS),
    summary: z.string().max(800),
    strengths: z.array(z.string().max(160)).min(1).max(4),
    /** Grounded in the transcript — observations paired with what was actually said. */
    evidence: z
      .array(
        z.object({
          observation: z.string().max(240),
          quote: z.string().max(240),
        }),
      )
      .max(5),
  }),

  /** The five rubric scores, carried through from class_assessments so the page can draw the bars. */
  baseline: z.object({
    fluency: z.number().int().min(1).max(10),
    listening: z.number().int().min(1).max(10),
    lexicalRange: z.number().int().min(1).max(10),
    grammaticalAccuracy: z.number().int().min(1).max(10),
    confidence: z.number().int().min(1).max(10),
    targetTask: z.enum(["failed", "heavy_help", "partial", "completed"]),
  }),

  /** Quoted back verbatim from the intake answer or the class. Never paraphrased, never invented. */
  goalInTheirWords: z.string().max(400),
  blocker: z.string().max(400),

  focusAreas: z
    .array(
      z.object({
        title: z.string().max(80),
        /** MUST tie back to goalInTheirWords — this is what makes it not a template. */
        whyItMattersToYou: z.string().max(400),
        whatWellDo: z.string().max(400),
        currentState: z.string().max(200),
        targetState: z.string().max(200),
      }),
    )
    .min(3)
    .max(5),

  weeklyOutline: z
    .array(
      z.object({
        weekRange: z.string().max(40),
        theme: z.string().max(80),
        objectives: z.array(z.string().max(160)).min(1).max(4),
        /** First person, observable, binary. The student checks this off. */
        milestone: z.string().max(160),
      }),
    )
    .min(4)
    .max(16),

  /** Re-measurement points. This is what makes progress visible rather than felt. */
  checkpoints: z
    .array(
      z.object({
        afterClass: z.union([z.literal(4), z.literal(8), z.literal(12)]),
        whatWeRemeasure: z.string().max(240),
      }),
    )
    .max(3),

  recommendation: z.object({
    sessionsPerWeek: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    durationWeeks: z.number().int().min(4).max(52),
    totalSessions: z.number().int(),
    planTier: z.enum(["starter_flow", "momentum_plan", "fluency_boost"]),
    rationale: z.string().max(500),
    expectedOutcome: z.string().max(300),
  }),

  /** Free value they can act on this week, before deciding anything. Reciprocity before the ask. */
  quickWins: z.array(z.string().max(200)).max(3),

  confidence: z.number().min(0).max(1),
  /** Model caveats. COACH-ONLY — never rendered to the student. */
  generationNotes: z.string().max(500).optional(),
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;

export type PlanTier = StudyPlan["recommendation"]["planTier"];

/** Maps the model's tier choice onto the real subscription plans. */
export const TIER_TO_PLAN_ID: Record<PlanTier, number> = {
  starter_flow: 1,
  momentum_plan: 2,
  fluency_boost: 3,
};

export const SESSIONS_PER_WEEK_TO_TIER: Record<1 | 2 | 3, PlanTier> = {
  1: "starter_flow",
  2: "momentum_plan",
  3: "fluency_boost",
};

/**
 * The model occasionally recommends 2 sessions/week and then picks
 * `starter_flow`. Frequency is the clinical judgment; the tier is bookkeeping —
 * so the frequency wins and the tier is corrected to match.
 */
export function reconcileTier(plan: StudyPlan): StudyPlan {
  const expected = SESSIONS_PER_WEEK_TO_TIER[plan.recommendation.sessionsPerWeek];
  if (plan.recommendation.planTier === expected) return plan;
  return {
    ...plan,
    recommendation: { ...plan.recommendation, planTier: expected },
  };
}

export type PlanStatus =
  | "generating"
  | "draft"
  | "reviewed"
  | "sent"
  | "superseded"
  | "failed";

/** Only `reviewed → sent` may dispatch the delivery email. */
export const ALLOWED_STATUS_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  generating: ["draft", "failed"],
  draft: ["reviewed", "failed", "superseded"],
  reviewed: ["sent", "draft", "superseded"],
  sent: ["superseded"],
  superseded: [],
  failed: [],
};
