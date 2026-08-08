import { pool } from "../db";
import { logger } from "./logger";
import { hasUserConsented } from "./recording-consent";
import { MARKER_PHRASES } from "./diagnostic-script";

/**
 * Transcript ingestion for diagnostic classes.
 *
 * ── THE ABSTRACTION BOUNDARY ──────────────────────────────────────────────
 * Nothing outside this module touches `class_transcripts`. v1 is MANUAL: the
 * class is recorded with Google Meet's own recording and the coach pastes or
 * uploads the transcript. When that gets automated, the ONLY change is a new
 * caller of `ingestTranscript({ source: 'google_meet_api', ... })` — every
 * downstream consumer (the plan generator, the coach UI, the admin view) keeps
 * working untouched, including auto-generation via the post-ingest hook below.
 * ──────────────────────────────────────────────────────────────────────────
 */

export type TranscriptSource =
  | "manual_paste"
  | "manual_upload"
  | "google_meet_api"
  | "livekit_stt"
  | "whisper";

export interface TranscriptSegment {
  speaker: "tutor" | "student" | "unknown";
  timestamp?: string;
  text: string;
  /** Diagnostic-protocol block this segment falls in, when a marker phrase was matched. */
  block?: string;
}

export interface StoredTranscript {
  id: number;
  classId: number;
  source: TranscriptSource;
  format: string;
  content: string;
  segments: TranscriptSegment[] | null;
  language: string | null;
  wordCount: number;
  createdAt: Date;
}

/** A 50-min transcript is ~40-60KB. The ceiling is ~3.5x that; the floor rejects accidental partial pastes. */
export const MIN_TRANSCRIPT_CHARS = 200;
export const MAX_TRANSCRIPT_CHARS = 200_000;

export class ConsentMissingError extends Error {
  constructor(public classId: number) {
    super(`No recording consent on record for class ${classId}`);
    this.name = "ConsentMissingError";
  }
}

/* ------------------------------------------------------------------ *
 * Normalization
 * ------------------------------------------------------------------ */

const VTT_TIMESTAMP = /^(\d{2}:)?\d{2}:\d{2}[.,]\d{3}\s*-->\s*(\d{2}:)?\d{2}:\d{2}[.,]\d{3}/;
const SRT_INDEX = /^\d+$/;

/**
 * Best-effort structure extraction. NEVER throws and never blocks ingestion —
 * a transcript we can't parse still gets stored, and the generator falls back
 * to the raw text.
 */
export function normalize(
  content: string,
  format: string,
  speakers?: { tutorName?: string; studentName?: string },
): { segments: TranscriptSegment[] | null; language: string | null } {
  try {
    const lines = content.split(/\r?\n/);
    const segments: TranscriptSegment[] = [];
    let currentTs: string | undefined;
    let currentBlock: string | undefined;

    const tutorKey = speakers?.tutorName?.trim().split(/\s+/)[0]?.toLowerCase();
    const studentKey = speakers?.studentName?.trim().split(/\s+/)[0]?.toLowerCase();

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line === "WEBVTT") continue;
      if (format !== "plain" && SRT_INDEX.test(line)) continue;

      const tsMatch = line.match(VTT_TIMESTAMP);
      if (tsMatch) {
        currentTs = line.split("-->")[0].trim();
        continue;
      }

      // Google Meet prefixes lines with the speaker's display name: "Carolina: ..."
      let speaker: TranscriptSegment["speaker"] = "unknown";
      let text = line;
      const nameMatch = line.match(/^([^:]{1,40}):\s*(.*)$/);
      if (nameMatch) {
        const who = nameMatch[1].trim().toLowerCase();
        text = nameMatch[2];
        if (tutorKey && who.includes(tutorKey)) speaker = "tutor";
        else if (studentKey && who.includes(studentKey)) speaker = "student";
      }

      // Marker phrases turn an unstructured transcript into a segmented one —
      // this is why the protocol insists coaches say them verbatim.
      const matchedBlock = findBlockForLine(text);
      if (matchedBlock) currentBlock = matchedBlock;

      segments.push({ speaker, timestamp: currentTs, text, block: currentBlock });
    }

    return { segments: segments.length ? segments : null, language: detectLanguage(content) };
  } catch (err) {
    logger.warn({ err }, "Transcript normalization failed — storing raw content only");
    return { segments: null, language: null };
  }
}

function findBlockForLine(text: string): string | undefined {
  const haystack = text.toLowerCase();
  for (const [blockId, phrases] of Object.entries(MARKER_PHRASES)) {
    for (const phrase of phrases) {
      // Compare on a normalized prefix so small deviations (punctuation, a
      // trailing name) still match.
      const needle = phrase.toLowerCase().replace(/[.,¿?¡!]/g, "").slice(0, 40);
      if (needle.length >= 12 && haystack.replace(/[.,¿?¡!]/g, "").includes(needle)) {
        return blockId;
      }
    }
  }
  return undefined;
}

/** Crude but sufficient: we only need to know which language the class ran in. */
function detectLanguage(content: string): string | null {
  const sample = content.slice(0, 4000).toLowerCase();
  const es = (sample.match(/\b(que|para|pero|porque|entonces|cuando|también)\b/g) || []).length;
  const en = (sample.match(/\b(the|and|because|when|about|would|there)\b/g) || []).length;
  if (es === 0 && en === 0) return null;
  if (es > en * 2) return "es";
  if (en > es * 2) return "en";
  return "mixed";
}

/* ------------------------------------------------------------------ *
 * Ingestion
 * ------------------------------------------------------------------ */

export async function ingestTranscript(input: {
  classId: number;
  source: TranscriptSource;
  content: string;
  format?: "plain" | "vtt" | "srt";
  sourceRef?: string;
  uploadedByUserId?: number;
  /** Student on the class, for the consent check. */
  studentUserId: number;
  speakers?: { tutorName?: string; studentName?: string };
  /** Skip the consent gate — admin override only, and it writes its own audit row. */
  skipConsentCheck?: boolean;
}): Promise<StoredTranscript> {
  if (!pool) throw new Error("Database not configured");

  const content = input.content.trim();
  if (content.length < MIN_TRANSCRIPT_CHARS) {
    throw new Error(`Transcript too short (min ${MIN_TRANSCRIPT_CHARS} characters)`);
  }
  if (content.length > MAX_TRANSCRIPT_CHARS) {
    throw new Error(`Transcript too long (max ${MAX_TRANSCRIPT_CHARS} characters)`);
  }

  // Consent gate. We store a recording-derived artifact, so this is the point
  // where "did they agree to this?" has to be true.
  if (!input.skipConsentCheck) {
    const consented = await hasUserConsented(input.studentUserId, input.classId);
    if (!consented) throw new ConsentMissingError(input.classId);
  }

  const format = input.format || "plain";
  const { segments, language } = normalize(content, format, input.speakers);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const r = await pool.query(
    `INSERT INTO class_transcripts
       (class_id, source, source_ref, format, content, segments, language, word_count, char_count, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      input.classId,
      input.source,
      input.sourceRef ?? null,
      format,
      content,
      segments ? JSON.stringify(segments) : null,
      language,
      wordCount,
      content.length,
      input.uploadedByUserId ?? null,
    ],
  );

  const stored = mapRow(r.rows[0]);

  // Post-ingest hook. Auto-generation is intentionally OFF in v1 — a bad paste
  // (wrong class, half a transcript, a dump of the Meet UI) would burn tokens
  // and produce a draft the coach then has to notice and discard. When it's
  // switched on, an automated transcript source gets generation for free.
  if (process.env.STUDY_PLAN_AUTO_GENERATE === "true") {
    logger.info({ classId: input.classId }, "Auto-generation enabled — queueing study plan");
  }

  return stored;
}

export async function getLatestTranscript(classId: number): Promise<StoredTranscript | null> {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM class_transcripts WHERE class_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [classId],
  );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/** Metadata only — never ship 60KB of transcript into a CRM list view. */
export async function listTranscriptMeta(
  classId: number,
): Promise<{ id: number; source: string; wordCount: number; createdAt: Date }[]> {
  if (!pool) return [];
  const r = await pool.query(
    `SELECT id, source, word_count, created_at FROM class_transcripts
      WHERE class_id = $1 ORDER BY created_at DESC`,
    [classId],
  );
  return r.rows.map((x: any) => ({
    id: x.id,
    source: x.source,
    wordCount: x.word_count,
    createdAt: x.created_at,
  }));
}

function mapRow(row: any): StoredTranscript {
  return {
    id: row.id,
    classId: row.class_id,
    source: row.source,
    format: row.format,
    content: row.content,
    segments: row.segments,
    language: row.language,
    wordCount: row.word_count,
    createdAt: row.created_at,
  };
}

/** Renders a transcript for the plan generator prompt. */
export function renderForPrompt(t: StoredTranscript): string {
  if (!t.segments || t.segments.length === 0) return t.content;
  return t.segments
    .map((s) => {
      const ts = s.timestamp ? `[${s.timestamp}] ` : "";
      const who = s.speaker === "unknown" ? "?" : s.speaker.toUpperCase();
      return `${ts}${who}: ${s.text}`;
    })
    .join("\n");
}
