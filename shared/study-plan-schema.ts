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
    summary: z.string().max(1500),
    strengths: z.array(z.string().max(240)).min(1).max(4),
    /** Grounded in the transcript — observations paired with what was actually said. */
    evidence: z
      .array(
        z.object({
          observation: z.string().max(400),
          quote: z.string().max(400),
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
  goalInTheirWords: z.string().max(600),
  blocker: z.string().max(800),

  focusAreas: z
    .array(
      z.object({
        title: z.string().max(80),
        /** MUST tie back to goalInTheirWords — this is what makes it not a template. */
        whyItMattersToYou: z.string().max(600),
        whatWellDo: z.string().max(600),
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
        objectives: z.array(z.string().max(240)).min(1).max(4),
        /** First person, observable, binary. The student checks this off. */
        milestone: z.string().max(240),
      }),
    )
    .min(4)
    .max(16),

  /** Re-measurement points. This is what makes progress visible rather than felt. */
  checkpoints: z
    .array(
      z.object({
        afterClass: z.union([z.literal(4), z.literal(8), z.literal(12)]),
        whatWeRemeasure: z.string().max(400),
      }),
    )
    .max(3),

  recommendation: z.object({
    sessionsPerWeek: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    durationWeeks: z.number().int().min(4).max(52),
    totalSessions: z.number().int(),
    planTier: z.enum(["starter_flow", "momentum_plan", "fluency_boost"]),
    rationale: z.string().max(900),
    expectedOutcome: z.string().max(500),
  }),

  /** Free value they can act on this week, before deciding anything. Reciprocity before the ask. */
  quickWins: z.array(z.string().max(300)).max(3),

  confidence: z.number().min(0).max(1),
  /** Model caveats. COACH-ONLY — never rendered to the student. */
  generationNotes: z.string().max(1200).optional(),
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

/* ------------------------------------------------------------------ *
 * JSON Schema for structured outputs.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE ZOD SCHEMA ABOVE:
 * the SDK's `zodOutputFormat` calls `z.toJSONSchema()`, which is a Zod 4 API.
 * This project is on Zod 3 (and drizzle-zod pins it), so that helper throws at
 * runtime — a crash the typechecker cannot see, because the types line up fine.
 * Rather than upgrade Zod across the whole Portal for one call site, the schema
 * the API enforces is written out explicitly here.
 *
 * Division of labour:
 *   - This JSON Schema constrains the SHAPE server-side (which keys, which
 *     enums, no extras).
 *   - `studyPlanSchema` (Zod) validates the DETAIL when the response comes back
 *     — string lengths, array bounds, numeric ranges.
 *
 * Length/range constraints are deliberately absent here: structured outputs
 * does not support minLength/maxLength/minimum/maximum, so they'd be stripped
 * anyway. Zod enforces them on parse.
 *
 * `assertSchemasAgree()` below guards the one real risk of having two
 * definitions — that they drift.
 * ------------------------------------------------------------------ */

const str = { type: "string" } as const;
const int = { type: "integer" } as const;

export const studyPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline", "diagnosis", "baseline", "goalInTheirWords", "blocker",
    "focusAreas", "weeklyOutline", "checkpoints", "recommendation",
    "quickWins", "confidence", "generationNotes",
  ],
  properties: {
    headline: str,
    diagnosis: {
      type: "object",
      additionalProperties: false,
      required: ["cefrLevel", "summary", "strengths", "evidence"],
      properties: {
        cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
        summary: str,
        strengths: { type: "array", items: str },
        evidence: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["observation", "quote"],
            properties: { observation: str, quote: str },
          },
        },
      },
    },
    baseline: {
      type: "object",
      additionalProperties: false,
      required: ["fluency", "listening", "lexicalRange", "grammaticalAccuracy", "confidence", "targetTask"],
      properties: {
        fluency: int, listening: int, lexicalRange: int,
        grammaticalAccuracy: int, confidence: int,
        targetTask: { type: "string", enum: ["failed", "heavy_help", "partial", "completed"] },
      },
    },
    goalInTheirWords: str,
    blocker: str,
    focusAreas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "whyItMattersToYou", "whatWellDo", "currentState", "targetState"],
        properties: {
          title: str, whyItMattersToYou: str, whatWellDo: str,
          currentState: str, targetState: str,
        },
      },
    },
    weeklyOutline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["weekRange", "theme", "objectives", "milestone"],
        properties: {
          weekRange: str, theme: str,
          objectives: { type: "array", items: str },
          milestone: str,
        },
      },
    },
    checkpoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["afterClass", "whatWeRemeasure"],
        properties: {
          afterClass: { type: "integer", enum: [4, 8, 12] },
          whatWeRemeasure: str,
        },
      },
    },
    recommendation: {
      type: "object",
      additionalProperties: false,
      required: ["sessionsPerWeek", "durationWeeks", "totalSessions", "planTier", "rationale", "expectedOutcome"],
      properties: {
        sessionsPerWeek: { type: "integer", enum: [1, 2, 3] },
        durationWeeks: int,
        totalSessions: int,
        planTier: { type: "string", enum: ["starter_flow", "momentum_plan", "fluency_boost"] },
        rationale: str,
        expectedOutcome: str,
      },
    },
    quickWins: { type: "array", items: str },
    confidence: { type: "number" },
    generationNotes: str,
  },
} as const;

/**
 * Drift guard. Two schema definitions is a maintenance hazard; this makes the
 * hazard loud instead of silent. Called by the test suite, not at runtime.
 */
export function assertSchemasAgree(): string[] {
  const problems: string[] = [];
  const zodKeys = Object.keys(studyPlanSchema.shape).sort();
  const jsonKeys = Object.keys(studyPlanJsonSchema.properties).sort();
  const onlyZod = zodKeys.filter((k) => !jsonKeys.includes(k));
  const onlyJson = jsonKeys.filter((k) => !zodKeys.includes(k));
  if (onlyZod.length) problems.push(`solo en Zod: ${onlyZod.join(", ")}`);
  if (onlyJson.length) problems.push(`solo en JSON Schema: ${onlyJson.join(", ")}`);
  return problems;
}

/* ------------------------------------------------------------------ *
 * Length coercion.
 *
 * The limits exist so the plan page lays out correctly, not because 801
 * characters is meaningfully worse than 800. Structured outputs cannot enforce
 * them (no minLength/maxLength support), so the model is told about them in the
 * prompt — and this trims the occasional overshoot rather than throwing away a
 * finished generation over a few characters, which would waste the call and
 * block the coach.
 *
 * Strings are cut at a word boundary; arrays keep their first N items, which
 * are the ones the model ranked highest.
 * ------------------------------------------------------------------ */

function cut(s: unknown, max: number): string {
  const v = typeof s === "string" ? s.trim() : "";
  if (v.length <= max) return v;
  const slice = v.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trim();
}

function take<T>(a: unknown, max: number): T[] {
  return (Array.isArray(a) ? a : []).slice(0, max) as T[];
}

/** Returns the coerced plan plus what was trimmed, so the trimming is visible in logs. */
export function coerceToLimits(raw: any): { plan: any; trimmed: string[] } {
  const trimmed: string[] = [];
  const p = structuredClone(raw);

  const S = (obj: any, key: string, max: number, path: string) => {
    if (!obj) return;
    const before = typeof obj[key] === "string" ? obj[key].length : 0;
    obj[key] = cut(obj[key], max);
    if (before !== obj[key].length) trimmed.push(`${path} ${before}->${obj[key].length}`);
  };
  const A = (before: number, after: number, path: string) => {
    if (before !== after) trimmed.push(`${path} ${before}->${after}`);
  };

  S(p, "headline", 120, "headline");
  S(p, "goalInTheirWords", 600, "goalInTheirWords");
  S(p, "blocker", 800, "blocker");

  if (p.diagnosis) {
    S(p.diagnosis, "summary", 1500, "diagnosis.summary");
    const nb = (p.diagnosis.strengths ?? []).length;
    p.diagnosis.strengths = take<string>(p.diagnosis.strengths, 4).map((x) => cut(x, 240));
    A(nb, p.diagnosis.strengths.length, "diagnosis.strengths[]");
    p.diagnosis.evidence = take<any>(p.diagnosis.evidence, 5).map((e: any) => ({
      observation: cut(e?.observation, 400),
      quote: cut(e?.quote, 400),
    }));
  }

  const fb = (p.focusAreas ?? []).length;
  p.focusAreas = take<any>(p.focusAreas, 5).map((f: any) => ({
    title: cut(f?.title, 80),
    whyItMattersToYou: cut(f?.whyItMattersToYou, 600),
    whatWellDo: cut(f?.whatWellDo, 600),
    currentState: cut(f?.currentState, 200),
    targetState: cut(f?.targetState, 200),
  }));
  A(fb, p.focusAreas.length, "focusAreas[]");

  const wb = (p.weeklyOutline ?? []).length;
  p.weeklyOutline = take<any>(p.weeklyOutline, 16).map((w: any) => ({
    weekRange: cut(w?.weekRange, 40),
    theme: cut(w?.theme, 80),
    objectives: take<string>(w?.objectives, 4).map((o) => cut(o, 240)),
    milestone: cut(w?.milestone, 240),
  }));
  A(wb, p.weeklyOutline.length, "weeklyOutline[]");

  p.checkpoints = take<any>(p.checkpoints, 3).map((c: any) => ({
    afterClass: c?.afterClass,
    whatWeRemeasure: cut(c?.whatWeRemeasure, 400),
  }));

  if (p.recommendation) {
    S(p.recommendation, "rationale", 900, "recommendation.rationale");
    S(p.recommendation, "expectedOutcome", 500, "recommendation.expectedOutcome");
  }

  p.quickWins = take<string>(p.quickWins, 3).map((q) => cut(q, 300));
  if (typeof p.generationNotes === "string") S(p, "generationNotes", 1200, "generationNotes");

  return { plan: p, trimmed };
}
