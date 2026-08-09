import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import crypto from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../db";
import { config } from "../config";
import { logger } from "./logger";
import { trackAiCall, AiBudgetExceededError } from "./ai-cost-guard";
import { getLatestTranscript, renderForPrompt } from "./transcripts";
import { getIntakeForClass } from "./intake";
import { getAssessmentForClass } from "./assessments";
import {
  studyPlanSchema,
  reconcileTier,
  type StudyPlan,
  type PlanStatus,
} from "@shared/study-plan-schema";
import {
  STUDY_PLAN_SYSTEM,
  STUDY_PLAN_PROMPT_VERSION,
  renderStudyPlanUserPrompt,
} from "./ai/prompts";

/**
 * Generates the Flight Plan from the diagnostic class.
 *
 * MODEL CHOICE — claude-opus-5. The plan IS the product: it's generated once
 * per student, it's the artifact that carries the sale, and it's reviewed by a
 * human before anyone sees it. A 50-minute transcript is ~15-20K input tokens;
 * at $5/$25 per MTok that's roughly $0.10-0.20 per plan, so at 200 diagnostics a
 * month this is under $40. Quality dominates cost by an order of magnitude here.
 * claude-sonnet-5 is the documented step-down if volume ever makes it matter.
 *
 * The existing ai-tutor.ts pins claude-sonnet-4-20250514, whose published
 * retirement date has already passed — do not extend that ID to new features.
 */

const MODEL = "claude-opus-5";
/** On Opus 5 this caps thinking AND response text together — thinking is on by default. */
const MAX_TOKENS = 16000;
/** Reject anything that would blow the context; warn well before that. */
const MAX_INPUT_TOKENS = 120_000;
const WARN_INPUT_TOKENS = 40_000;
/** Per-class ceiling so a coach hammering "regenerate" can't drain the budget. */
export const MAX_REGENERATIONS_PER_CLASS = 5;

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

export class PlanGenerationError extends Error {
  constructor(message: string, public reason: string) {
    super(message);
    this.name = "PlanGenerationError";
  }
}

export interface StudyPlanRow {
  id: number;
  userId: number;
  classId: number | null;
  version: number;
  status: PlanStatus;
  language: string;
  content: StudyPlan | null;
  aiContent: StudyPlan | null;
  shareToken: string | null;
  sentAt: Date | null;
  firstViewedAt: Date | null;
  viewCount: number;
  failureReason: string | null;
  createdAt: Date;
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

export interface GenerateContext {
  classId: number;
  userId: number;
  studentFirstName: string;
  coachName: string;
  classDate: string;
  classCategory: string | null;
  /** users.preferredLanguage; falls back to the inverse of the target language. */
  preferredLanguage?: string | null;
}

/**
 * Assembles the prompt without calling the model. Exposed so the route can
 * offer `?dryRun=1` — verifies prompt assembly and token budget against a real
 * transcript for free.
 */
export async function buildPrompt(ctx: GenerateContext) {
  const transcript = await getLatestTranscript(ctx.classId);
  if (!transcript) {
    throw new PlanGenerationError("No transcript for this class", "no_transcript");
  }

  const intake = await getIntakeForClass(ctx.classId, ctx.userId);
  const rubric = await getAssessmentForClass(ctx.classId);

  const { audience, targetLanguage } = parseClassCategory(ctx.classCategory);
  // A Spanish speaker learning English gets the plan in Spanish, and vice versa.
  const outputLanguage: "es" | "en" =
    ctx.preferredLanguage === "es" || ctx.preferredLanguage === "en"
      ? ctx.preferredLanguage
      : targetLanguage === "english"
        ? "es"
        : "en";

  const userPrompt = renderStudyPlanUserPrompt({
    studentFirstName: ctx.studentFirstName,
    outputLanguage,
    targetLanguage,
    audience,
    coachName: ctx.coachName,
    classDate: ctx.classDate,
    selfLevel: intake?.selfLevel,
    goalCategory: intake?.goalCategory,
    goalVerbatim: intake?.goal,
    blocker: intake?.blocker,
    rubric: rubric
      ? {
          fluency: rubric.fluency,
          listening: rubric.listening,
          lexicalRange: rubric.lexicalRange,
          grammaticalAccuracy: rubric.grammaticalAccuracy,
          confidence: rubric.confidence,
          targetTaskResult: rubric.targetTaskResult,
          cefrEstimate: rubric.cefrEstimate,
          notes: rubric.notes,
        }
      : null,
    transcript: renderForPrompt(transcript),
  });

  return { userPrompt, outputLanguage, transcript, intake, rubric };
}

/** Pre-flight count. Never estimate with tiktoken — it undercounts Claude tokens badly. */
export async function countPromptTokens(userPrompt: string): Promise<number | null> {
  if (!anthropic) return null;
  try {
    const r = await anthropic.messages.countTokens({
      model: MODEL,
      system: STUDY_PLAN_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    return r.input_tokens;
  } catch (err) {
    logger.warn({ err }, "countTokens failed — proceeding without a pre-flight check");
    return null;
  }
}

async function callModel(userPrompt: string, classId: number): Promise<StudyPlan> {
  if (!anthropic) throw new PlanGenerationError("ANTHROPIC_API_KEY not configured", "no_api_key");

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: STUDY_PLAN_SYSTEM,
        // Stable prefix — Opus 5's minimum cacheable prefix is 512 tokens, and
        // the regeneration path plus eval sweeps are real repeated traffic.
        cache_control: { type: "ephemeral" },
      },
    ],
    thinking: { type: "adaptive" },
    output_config: {
      // The SDK's effort union tops out at 'max'; 'high' is the documented
      // setting for intelligence-sensitive work that isn't agentic coding.
      effort: "high",
      format: zodOutputFormat(studyPlanSchema),
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  // Check stop_reason BEFORE reading the output. Opus 5 ships elevated
  // cybersecurity safeguards and returns a normal 200 on a refusal — code that
  // reads parsed_output unconditionally breaks here.
  if (message.stop_reason === "refusal") {
    throw new PlanGenerationError("Model declined the request", "refusal");
  }
  if (message.stop_reason === "max_tokens") {
    throw new PlanGenerationError("Output truncated at max_tokens", "max_tokens");
  }

  const parsed = message.parsed_output as StudyPlan | null;
  if (!parsed) {
    throw new PlanGenerationError("Model output did not match the schema", "schema_mismatch");
  }

  logger.info(
    { classId, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    "Study plan generated",
  );

  return reconcileTier(parsed);
}

/** Fixture path for P2F_AI_MOCK — lets every downstream path be tested at zero cost. */
function loadMockPlan(): StudyPlan {
  const raw = readFileSync(join(__dirname, "fixtures", "study-plan.sample.json"), "utf8");
  return reconcileTier(studyPlanSchema.parse(JSON.parse(raw)));
}

/**
 * Generate (or regenerate) a plan for a diagnostic class.
 *
 * Coach-triggered, not automatic on transcript save: a bad paste — wrong class,
 * half a transcript, a dump of the Meet UI — would silently burn tokens and
 * produce a draft someone then has to notice and discard. The coach is the only
 * person who knows whether the transcript is complete.
 */
export async function generateStudyPlan(ctx: GenerateContext): Promise<StudyPlanRow> {
  if (!pool) throw new PlanGenerationError("Database not configured", "no_db");

  const priorCount = await countPlansForClass(ctx.classId);
  if (priorCount >= MAX_REGENERATIONS_PER_CLASS) {
    throw new PlanGenerationError(
      `Regeneration limit reached (${MAX_REGENERATIONS_PER_CLASS})`,
      "regeneration_limit",
    );
  }

  const { userPrompt, outputLanguage, transcript, intake } = await buildPrompt(ctx);

  // Insert the row BEFORE calling the model. A double-click hits the partial
  // unique index and returns the in-flight row instead of firing a second call.
  const version = priorCount + 1;
  let row: StudyPlanRow;
  try {
    row = await insertGenerating(ctx, version, outputLanguage, transcript.id, intake?.id ?? null);
  } catch (err: any) {
    if (err?.code === "23505") {
      const existing = await getActivePlanForClass(ctx.classId);
      if (existing) return existing;
    }
    throw err;
  }

  try {
    let plan: StudyPlan;
    if (process.env.P2F_AI_MOCK === "1") {
      logger.warn({ classId: ctx.classId }, "P2F_AI_MOCK=1 — returning fixture, no model call");
      plan = loadMockPlan();
    } else {
      const tokens = await countPromptTokens(userPrompt);
      if (tokens && tokens > MAX_INPUT_TOKENS) {
        throw new PlanGenerationError(`Prompt too large (${tokens} tokens)`, "prompt_too_large");
      }
      if (tokens && tokens > WARN_INPUT_TOKENS) {
        logger.warn({ classId: ctx.classId, tokens }, "Unusually large study-plan prompt");
      }

      // No userId: the spend is the business's, not the student's. Passing one
      // would enforce AI_PER_USER_DAILY_USD (default $1) and five regenerations
      // would trip it — the per-class cap above is the right lever instead.
      plan = await trackAiCall(
        { provider: "anthropic", model: MODEL, feature: "study_plan", classId: ctx.classId },
        () => callModel(userPrompt, ctx.classId),
      );
    }

    await pool.query(
      `UPDATE study_plans
          SET status = 'draft', content = $2, ai_content = $2, model = $3,
              prompt_version = $4, updated_at = NOW()
        WHERE id = $1`,
      [row.id, JSON.stringify(plan), MODEL, STUDY_PLAN_PROMPT_VERSION],
    );

    return (await getPlanById(row.id))!;
  } catch (err: any) {
    const reason =
      err instanceof AiBudgetExceededError
        ? "budget_exceeded"
        : err instanceof PlanGenerationError
          ? err.reason
          : "unknown";
    await pool.query(
      `UPDATE study_plans SET status = 'failed', failure_reason = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, `${reason}: ${String(err?.message).slice(0, 400)}`],
    );
    logger.error({ err, classId: ctx.classId, reason }, "Study plan generation failed");
    throw err;
  }
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

async function insertGenerating(
  ctx: GenerateContext,
  version: number,
  language: string,
  transcriptId: number,
  intakeId: number | null,
): Promise<StudyPlanRow> {
  const r = await pool!.query(
    `INSERT INTO study_plans
       (user_id, class_id, transcript_id, intake_id, version, status, language, share_token)
     VALUES ($1,$2,$3,$4,$5,'generating',$6,$7)
     RETURNING *`,
    [
      ctx.userId,
      ctx.classId,
      transcriptId,
      intakeId,
      version,
      language,
      crypto.randomBytes(32).toString("base64url"),
    ],
  );
  return mapRow(r.rows[0]);
}

async function countPlansForClass(classId: number): Promise<number> {
  const r = await pool!.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM study_plans WHERE class_id = $1`,
    [classId],
  );
  return parseInt(r.rows[0]?.n || "0", 10);
}

export async function getPlanById(id: number): Promise<StudyPlanRow | null> {
  if (!pool) return null;
  const r = await pool.query(`SELECT * FROM study_plans WHERE id = $1`, [id]);
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

export async function getActivePlanForClass(classId: number): Promise<StudyPlanRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM study_plans
      WHERE class_id = $1 AND status NOT IN ('superseded','failed')
      ORDER BY version DESC LIMIT 1`,
    [classId],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/**
 * Public read by share token. Stamps view tracking — an unopened plan is a
 * wasted diagnostic, so `first_viewed_at` is the signal the drip nudge keys on.
 */
export async function getPlanByShareToken(token: string): Promise<StudyPlanRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `UPDATE study_plans
        SET view_count = view_count + 1,
            first_viewed_at = COALESCE(first_viewed_at, NOW()),
            last_viewed_at = NOW()
      WHERE share_token = $1 AND status = 'sent'
      RETURNING *`,
    [token],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/** Coach edits land in `content`; `ai_content` keeps the untouched model output as gold data. */
export async function saveCoachEdit(
  planId: number,
  content: StudyPlan,
  editedBy: number,
): Promise<StudyPlanRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `UPDATE study_plans
        SET content = $2, edited_by = $3, status = 'reviewed', reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status IN ('draft','reviewed')
      RETURNING *`,
    [planId, JSON.stringify(content), editedBy],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

export async function markSent(planId: number): Promise<StudyPlanRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `UPDATE study_plans SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'reviewed'
      RETURNING *`,
    [planId],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

function mapRow(row: any): StudyPlanRow {
  return {
    id: row.id,
    userId: row.user_id,
    classId: row.class_id,
    version: row.version,
    status: row.status,
    language: row.language,
    content: row.content,
    aiContent: row.ai_content,
    shareToken: row.share_token,
    sentAt: row.sent_at,
    firstViewedAt: row.first_viewed_at,
    viewCount: row.view_count,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  };
}

/** `classCategory` is stored as `${audience}-${language}`, e.g. "adults-english". */
function parseClassCategory(cat: string | null): {
  audience: "adults" | "kids";
  targetLanguage: "english" | "spanish";
} {
  const s = cat || "adults-english";
  return {
    audience: s.startsWith("kids") ? "kids" : "adults",
    targetLanguage: s.endsWith("spanish") ? "spanish" : "english",
  };
}
