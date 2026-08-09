import { pool } from "../db";
import { logger } from "./logger";

/**
 * Recording consent.
 *
 * v1 was written for LiveKit. The diagnostic class is recorded with Google
 * Meet's own recording and the transcript feeds an AI-generated study plan —
 * a materially different scope — so the wording was revised and the version
 * bumped. The student ticks the v2 text on the website booking form; recording
 * it as v1 would misrepresent what they actually agreed to.
 */
export const CURRENT_POLICY_VERSION = "v2-2026-08";

/**
 * Versions that still count as valid consent on read.
 *
 * Kept as a SET rather than a single constant on purpose: checking against
 * only CURRENT_POLICY_VERSION means the next bump silently invalidates every
 * consent on file, and transcript ingestion starts 412-ing for students who
 * did consent. Drop a version from this list only when you actually intend to
 * re-ask those people.
 */
export const ACCEPTED_POLICY_VERSIONS = [CURRENT_POLICY_VERSION, "v1-2026-05"];

export async function hasUserConsented(userId: number, classId?: number): Promise<boolean> {
  if (!pool) return false;
  // A global (scope='global') consent covers all classes. Otherwise we need a
  // class-specific consent for the given classId.
  const r = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM recording_consents
      WHERE user_id = $1
        AND policy_version = ANY($2)
        AND ((scope = 'global') OR (scope = 'class' AND class_id = $3))`,
    [userId, ACCEPTED_POLICY_VERSIONS, classId ?? null]
  );
  return parseInt(r.rows[0]?.count || "0") > 0;
}

export async function recordConsent(input: {
  userId: number;
  classId?: number;
  scope: "class" | "global";
  ipAddress?: string;
  userAgent?: string;
  /**
   * What the client believed it was showing. NOT trusted — the server decides
   * what version it records. It's compared only so a drift between the website
   * copy and this constant shows up in the logs instead of silently filing the
   * wrong version.
   */
  clientPolicyVersion?: string;
}): Promise<void> {
  if (!pool) return;

  if (input.clientPolicyVersion && input.clientPolicyVersion !== CURRENT_POLICY_VERSION) {
    logger.warn(
      { client: input.clientPolicyVersion, server: CURRENT_POLICY_VERSION, userId: input.userId },
      "Consent policy version drift — the website is showing different wording than the server records",
    );
  }

  // No upsert — every click creates a new audit row. That's the point: an
  // immutable trail. We dedupe at read time (hasUserConsented).
  await pool.query(
    `INSERT INTO recording_consents (user_id, class_id, scope, policy_version, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.userId, input.classId ?? null, input.scope, CURRENT_POLICY_VERSION, input.ipAddress ?? null, input.userAgent ?? null]
  );
}
