import { pool } from "../db";
import { logger } from "./logger";
import { emailService } from "./email";

/**
 * Per-1M-tokens pricing in USD (input, output). Update when providers change.
 * Whisper / Deepgram price per audio second; we store cost directly.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  // Anthropic
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  // Embeddings
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
};

const AUDIO_PRICING_PER_MIN: Record<string, number> = {
  "whisper-1": 0.006,
  "deepgram-nova-2": 0.043 / 10, // approx; update when contract is signed
};

const DAILY_BUDGET_USD = parseFloat(process.env.AI_DAILY_BUDGET_USD || "10");
const MONTHLY_BUDGET_USD = parseFloat(process.env.AI_MONTHLY_BUDGET_USD || "200");
const PER_USER_DAILY_USD = parseFloat(process.env.AI_PER_USER_DAILY_USD || "1");
const ALERT_THRESHOLD_PCT = 0.5; // log warn at 50% of daily budget

let alertSent50pct = false;
let alertSent100pct = false;
let lastResetDay: string | undefined;

function todayKey(): string {
  return new Date().toISOString().substring(0, 10);
}

function maybeResetDailyAlerts() {
  const today = todayKey();
  if (lastResetDay !== today) {
    alertSent50pct = false;
    alertSent100pct = false;
    lastResetDay = today;
  }
}

export class AiBudgetExceededError extends Error {
  constructor(public scope: "daily" | "monthly" | "user", public current: number, public cap: number) {
    super(`AI budget exceeded (${scope}): $${current.toFixed(2)} >= $${cap.toFixed(2)}`);
    this.name = "AiBudgetExceededError";
  }
}

export function calculateCostUsd(params: {
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  audioSeconds?: number;
}): number {
  const { model, tokensIn = 0, tokensOut = 0, audioSeconds = 0 } = params;
  if (audioSeconds > 0) {
    const perMin = AUDIO_PRICING_PER_MIN[model] || 0;
    return (audioSeconds / 60) * perMin;
  }
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
}

export async function getDailyCostUsd(): Promise<number> {
  if (!pool) return 0;
  const r = await pool.query<{ total: string | null }>(
    `SELECT SUM(cost_usd)::text AS total FROM ai_usage
     WHERE created_at >= NOW() - INTERVAL '24 hours' AND status='success'`
  );
  return parseFloat(r.rows[0]?.total || "0");
}

export async function getMonthlyCostUsd(): Promise<number> {
  if (!pool) return 0;
  const r = await pool.query<{ total: string | null }>(
    `SELECT SUM(cost_usd)::text AS total FROM ai_usage
     WHERE created_at >= date_trunc('month', NOW()) AND status='success'`
  );
  return parseFloat(r.rows[0]?.total || "0");
}

export async function getUserDailyCostUsd(userId: number): Promise<number> {
  if (!pool) return 0;
  const r = await pool.query<{ total: string | null }>(
    `SELECT SUM(cost_usd)::text AS total FROM ai_usage
     WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours' AND status='success'`,
    [userId]
  );
  return parseFloat(r.rows[0]?.total || "0");
}

/**
 * Throws AiBudgetExceededError if the calling user OR the system as a whole
 * has exceeded its daily/monthly budget. Call this BEFORE any AI request.
 */
export async function assertWithinBudget(userId?: number): Promise<void> {
  const daily = await getDailyCostUsd();
  if (daily >= DAILY_BUDGET_USD) {
    await maybeAlertBudget(daily, "blocked");
    throw new AiBudgetExceededError("daily", daily, DAILY_BUDGET_USD);
  }
  const monthly = await getMonthlyCostUsd();
  if (monthly >= MONTHLY_BUDGET_USD) {
    throw new AiBudgetExceededError("monthly", monthly, MONTHLY_BUDGET_USD);
  }
  if (userId !== undefined) {
    const userDaily = await getUserDailyCostUsd(userId);
    if (userDaily >= PER_USER_DAILY_USD) {
      throw new AiBudgetExceededError("user", userDaily, PER_USER_DAILY_USD);
    }
  }
  await maybeAlertBudget(daily, "ok");
}

async function maybeAlertBudget(currentDaily: number, status: "ok" | "blocked") {
  maybeResetDailyAlerts();
  const pct = currentDaily / DAILY_BUDGET_USD;
  if (pct >= 1 && !alertSent100pct) {
    alertSent100pct = true;
    logger.error({ currentDaily, budget: DAILY_BUDGET_USD, status }, "AI daily budget reached — calls blocked");
    emailService.sendAdminNotification({
      subject: `🚨 AI daily budget reached ($${currentDaily.toFixed(2)})`,
      eventType: "AI Budget Alert",
      details: [
        { label: "Spent today", value: `$${currentDaily.toFixed(2)}` },
        { label: "Budget", value: `$${DAILY_BUDGET_USD.toFixed(2)}` },
        { label: "Action", value: "All new AI calls are now blocked until tomorrow." },
      ],
    }).catch(() => {});
  } else if (pct >= ALERT_THRESHOLD_PCT && !alertSent50pct) {
    alertSent50pct = true;
    logger.warn({ currentDaily, budget: DAILY_BUDGET_USD }, `AI daily spend at ${Math.round(pct * 100)}% of budget`);
  }
}

export interface TrackAiCallOpts {
  provider: "openai" | "anthropic" | "whisper" | "deepgram";
  model: string;
  feature: string;
  userId?: number;
  classId?: number;
  traceId?: string;
}

/**
 * Wraps an AI call. Enforces budget BEFORE invoking, then persists usage AFTER.
 * The fn returned value should expose `usage` (token counts) on it; the
 * extractor pulls them out. For audio APIs (Whisper), pass audioSeconds.
 */
export async function trackAiCall<T>(
  opts: TrackAiCallOpts,
  fn: () => Promise<T>,
  extract?: (result: T) => { tokensIn?: number; tokensOut?: number; audioSeconds?: number }
): Promise<T> {
  await assertWithinBudget(opts.userId);

  const t0 = Date.now();
  let status: "success" | "error" = "success";
  let errorMessage: string | undefined;
  let result: T | undefined;
  try {
    result = await fn();
    return result;
  } catch (err: any) {
    status = "error";
    errorMessage = err?.message?.substring(0, 500);
    throw err;
  } finally {
    const durationMs = Date.now() - t0;
    let tokensIn = 0, tokensOut = 0, audioSeconds = 0;
    if (result && extract) {
      const ex = extract(result);
      tokensIn = ex.tokensIn || 0;
      tokensOut = ex.tokensOut || 0;
      audioSeconds = ex.audioSeconds || 0;
    }
    const costUsd = calculateCostUsd({ model: opts.model, tokensIn, tokensOut, audioSeconds });

    if (pool) {
      pool.query(
        `INSERT INTO ai_usage (provider, model, feature, user_id, class_id,
            tokens_in, tokens_out, audio_seconds, cost_usd, duration_ms,
            status, error_message, trace_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          opts.provider, opts.model, opts.feature,
          opts.userId ?? null, opts.classId ?? null,
          tokensIn, tokensOut, audioSeconds, costUsd, durationMs,
          status, errorMessage ?? null, opts.traceId ?? null,
        ]
      ).catch(err => logger.error({ err }, "Failed to persist ai_usage"));
    }
  }
}
