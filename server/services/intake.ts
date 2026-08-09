import { pool } from "../db";
import { logger } from "./logger";
import { INTAKE_SCHEMA_VERSION, type IntakePayload } from "@shared/intake";

/**
 * Persistence for the booking-form qualification answers.
 *
 * Uses `pool` directly rather than going through IStorage — the same choice
 * feature-flags, recording-consent and ai-cost-guard made. Adding methods to
 * IStorage means implementing them twice (storage.ts + storage-database.ts)
 * for no benefit.
 */

export interface IntakeRow {
  id: number;
  userId: number;
  classId: number | null;
  source: string;
  goal: string | null;
  goalCategory: string | null;
  blocker: string | null;
  deadline: string | null;
  selfLevel: string | null;
  weeklyTime: string | null;
  raw: Record<string, unknown> | null;
  locale: string | null;
  createdAt: Date;
}

/** Empty strings come off the form for skipped optional selects; store NULL instead. */
function nullIfBlank(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function recordIntake(input: {
  userId: number;
  classId?: number;
  source: "booking" | "lead" | "admin";
  intake: IntakePayload;
  locale?: string;
}): Promise<number | null> {
  if (!pool) return null;
  const i = input.intake as Record<string, unknown>;
  try {
    const r = await pool.query<{ id: number }>(
      `INSERT INTO intake_responses
         (user_id, class_id, source, schema_version, goal, goal_category, blocker,
          deadline, self_level, weekly_time, raw, locale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        input.userId,
        input.classId ?? null,
        input.source,
        typeof i.version === "number" ? i.version : INTAKE_SCHEMA_VERSION,
        nullIfBlank(i.goal),
        nullIfBlank(i.goalCategory),
        nullIfBlank(i.blocker),
        nullIfBlank(i.deadline),
        nullIfBlank(i.selfLevel),
        nullIfBlank(i.weeklyTime),
        JSON.stringify(input.intake),
        nullIfBlank(i.locale) ?? input.locale ?? null,
      ],
    );
    return r.rows[0]?.id ?? null;
  } catch (err) {
    // Never fail a booking because the intake write failed — the class is the
    // thing the student is waiting on; the answers are recoverable from `raw`
    // on the lead record.
    logger.error({ err, userId: input.userId }, "Failed to persist intake response");
    return null;
  }
}

function mapRow(row: any): IntakeRow {
  return {
    id: row.id,
    userId: row.user_id,
    classId: row.class_id,
    source: row.source,
    goal: row.goal,
    goalCategory: row.goal_category,
    blocker: row.blocker,
    deadline: row.deadline,
    selfLevel: row.self_level,
    weeklyTime: row.weekly_time,
    raw: row.raw,
    locale: row.locale,
    createdAt: row.created_at,
  };
}

export async function getLatestIntakeForUser(userId: number): Promise<IntakeRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM intake_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/**
 * Intake for a specific class, falling back to the user's most recent answers.
 * The fallback covers the lead-form-then-book path, where the answers were
 * captured before any class existed.
 */
export async function getIntakeForClass(
  classId: number,
  userId?: number,
): Promise<IntakeRow | null> {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM intake_responses WHERE class_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [classId],
  );
  if (r.rows[0]) return mapRow(r.rows[0]);
  return userId ? getLatestIntakeForUser(userId) : null;
}

/* ------------------------------------------------------------------ *
 * Code → label, for the coach briefing.
 *
 * Rendered in the COACH's language, which is why the wire format carries codes
 * rather than the labels the visitor saw.
 * ------------------------------------------------------------------ */

type Lang = "es" | "en";

const LABELS: Record<string, Record<string, Record<Lang, string>>> = {
  goalCategory: {
    work: { es: "Trabajo o carrera", en: "Work or career" },
    travel: { es: "Viajar", en: "Travel" },
    relocate: { es: "Vivir o mudarse al exterior", en: "Living or moving abroad" },
    study: { es: "Estudios o un examen", en: "School or an exam" },
    family: { es: "Familia", en: "Family" },
    other: { es: "Otro", en: "Other" },
  },
  selfLevel: {
    none: { es: "Ninguno", en: "None" },
    a1: { es: "Entiende algo pero casi no habla", en: "Understands some, barely speaks" },
    a2: { es: "Se defiende con frases cortas", en: "Gets by in short sentences" },
    b1: { es: "Conversa pero se traba y le falta vocabulario", en: "Converses but stalls, lacks vocabulary" },
    b2: { es: "Habla bien; quiere pulir y sonar natural", en: "Speaks well; wants to polish" },
    c1: { es: "Avanzado", en: "Advanced" },
  },
  blocker: {
    listening: { es: "Entender cuando hablan rápido", en: "Understanding fast speech" },
    word_recall: { es: "Encontrar las palabras a tiempo", en: "Finding words fast enough" },
    pronunciation: { es: "La pronunciación", en: "Pronunciation" },
    grammar: { es: "La gramática", en: "Grammar" },
    fear: { es: "Miedo a equivocarse", en: "Fear of making mistakes" },
    unsure: { es: "No está seguro/a", en: "Not sure" },
  },
  deadline: {
    asap: { es: "Lo antes posible", en: "As soon as possible" },
    "1_3_months": { es: "1 a 3 meses", en: "1 to 3 months" },
    "3_6_months": { es: "3 a 6 meses", en: "3 to 6 months" },
    "6_12_months": { es: "6 a 12 meses", en: "6 to 12 months" },
    no_deadline: { es: "Sin fecha límite", en: "No deadline" },
  },
};

export function labelFor(field: keyof typeof LABELS, code: string | null, lang: Lang): string | null {
  if (!code) return null;
  return LABELS[field]?.[code]?.[lang] ?? code;
}

/** One-line briefing summary for logs and compact UI. */
export function summarizeIntake(intake: IntakeRow, lang: Lang = "es"): string {
  const isEs = lang === "es";
  const parts: string[] = [];
  const goal = labelFor("goalCategory", intake.goalCategory, lang);
  if (goal) parts.push(`${isEs ? "Meta" : "Goal"}: ${goal}`);
  const level = labelFor("selfLevel", intake.selfLevel, lang);
  if (level) parts.push(`${isEs ? "Nivel" : "Level"}: ${level}`);
  const blocker = labelFor("blocker", intake.blocker, lang);
  if (blocker) parts.push(`${isEs ? "Bloqueo" : "Blocker"}: ${blocker}`);
  if (intake.goal) parts.push(`"${intake.goal}"`);
  return parts.join(" · ");
}
