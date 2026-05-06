import { pool } from "../db";

export const CURRENT_POLICY_VERSION = "v1-2026-05";

export async function hasUserConsented(userId: number, classId?: number): Promise<boolean> {
  if (!pool) return false;
  // A global (scope='global') consent in the current policy version covers all classes.
  // Otherwise we need a class-specific consent for the given classId.
  const r = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM recording_consents
      WHERE user_id = $1
        AND policy_version = $2
        AND ((scope = 'global') OR (scope = 'class' AND class_id = $3))`,
    [userId, CURRENT_POLICY_VERSION, classId ?? null]
  );
  return parseInt(r.rows[0]?.count || "0") > 0;
}

export async function recordConsent(input: {
  userId: number;
  classId?: number;
  scope: "class" | "global";
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  if (!pool) return;
  // No upsert — every click creates a new audit row. That's the point: an
  // immutable trail. We dedupe at read time (hasUserConsented).
  await pool.query(
    `INSERT INTO recording_consents (user_id, class_id, scope, policy_version, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.userId, input.classId ?? null, input.scope, CURRENT_POLICY_VERSION, input.ipAddress ?? null, input.userAgent ?? null]
  );
}
