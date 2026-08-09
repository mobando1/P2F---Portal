import { pool } from "../db";
import { RUBRIC_ASSESSMENT_POINTS, type TargetTaskResult } from "./diagnostic-script";

/**
 * The rubric — the numbers progress is measured against.
 *
 * The transcript gives qualitative evidence; this gives quantities. The coach
 * fills it in ~60 seconds after the diagnostic (assessment #1 = the baseline),
 * then re-scores the SAME five skills at class 4, 8 and 12. The student watches
 * the same bars move on their plan page.
 *
 * That re-scoring loop is the entire v1 progress system — no new subsystem, no
 * separate tracking UI, just the same short form three more times.
 */

export interface Assessment {
  id: number;
  classId: number;
  userId: number;
  assessmentNumber: number;
  fluency: number | null;
  listening: number | null;
  lexicalRange: number | null;
  grammaticalAccuracy: number | null;
  confidence: number | null;
  targetTaskResult: TargetTaskResult | null;
  cefrEstimate: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface AssessmentInput {
  classId: number;
  userId: number;
  assessmentNumber?: number;
  fluency?: number;
  listening?: number;
  lexicalRange?: number;
  grammaticalAccuracy?: number;
  confidence?: number;
  targetTaskResult?: TargetTaskResult;
  cefrEstimate?: string;
  notes?: string;
  assessedBy?: number;
}

function clampScore(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/**
 * Upsert by (classId, assessmentNumber) — the coach can correct a score they
 * just entered without creating a second row. The unique index makes this
 * race-safe.
 */
export async function saveAssessment(input: AssessmentInput): Promise<Assessment | null> {
  if (!pool) return null;
  const n = input.assessmentNumber ?? 1;
  const r = await pool.query(
    `INSERT INTO class_assessments
       (class_id, user_id, assessment_number, fluency, listening, lexical_range,
        grammatical_accuracy, confidence, target_task_result, cefr_estimate, notes, assessed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (class_id, assessment_number) DO UPDATE SET
       fluency = EXCLUDED.fluency,
       listening = EXCLUDED.listening,
       lexical_range = EXCLUDED.lexical_range,
       grammatical_accuracy = EXCLUDED.grammatical_accuracy,
       confidence = EXCLUDED.confidence,
       target_task_result = EXCLUDED.target_task_result,
       cefr_estimate = EXCLUDED.cefr_estimate,
       notes = EXCLUDED.notes,
       assessed_by = EXCLUDED.assessed_by
     RETURNING *`,
    [
      input.classId,
      input.userId,
      n,
      clampScore(input.fluency),
      clampScore(input.listening),
      clampScore(input.lexicalRange),
      clampScore(input.grammaticalAccuracy),
      clampScore(input.confidence),
      input.targetTaskResult ?? null,
      input.cefrEstimate ?? null,
      input.notes ?? null,
      input.assessedBy ?? null,
    ],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

export async function getAssessmentForClass(classId: number): Promise<Assessment | null> {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM class_assessments WHERE class_id = $1 ORDER BY assessment_number ASC LIMIT 1`,
    [classId],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/** All measurements for a student, oldest first — this is the progress series. */
export async function getAssessmentSeries(userId: number): Promise<Assessment[]> {
  if (!pool) return [];
  const r = await pool.query(
    `SELECT * FROM class_assessments WHERE user_id = $1 ORDER BY assessment_number ASC`,
    [userId],
  );
  return r.rows.map(mapRow);
}

/**
 * Which measurement is due next. Returns null when the student has already been
 * re-scored at every checkpoint.
 */
export function nextAssessmentNumber(existing: Assessment[]): number | null {
  const done = new Set(existing.map((a) => a.assessmentNumber));
  for (const point of RUBRIC_ASSESSMENT_POINTS) {
    if (!done.has(point)) return point;
  }
  return null;
}

function mapRow(row: any): Assessment {
  return {
    id: row.id,
    classId: row.class_id,
    userId: row.user_id,
    assessmentNumber: row.assessment_number,
    fluency: row.fluency,
    listening: row.listening,
    lexicalRange: row.lexical_range,
    grammaticalAccuracy: row.grammatical_accuracy,
    confidence: row.confidence,
    targetTaskResult: row.target_task_result,
    cefrEstimate: row.cefr_estimate,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
