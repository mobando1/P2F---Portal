import { pool } from "../db";
import { notificationService } from "./notification";
import { logger } from "./logger";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const TUTOR_DEADLINE_HOURS = 24;

// Postgres advisory lock keys (arbitrary but stable). Two int4s = (namespace, id).
// Namespace 42 is "P2F crons" by convention; 1 is the attendance sweep.
const ADVISORY_NAMESPACE = 42;
const ADVISORY_KEY_ATTENDANCE = 1;

let started = false;

/**
 * Acquires a transaction-scoped Postgres advisory lock so multiple Railway
 * replicas don't run sweeps concurrently. Returns null if another instance
 * already holds the lock.
 *
 * pg_try_advisory_lock is non-blocking — returns true if acquired, false if
 * someone else has it. We use the session-scoped variant and explicitly
 * unlock at the end so a long-running sweep on one instance doesn't starve
 * the other.
 */
async function withAdvisoryLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!pool) return null;
  const client = await pool.connect();
  try {
    const got = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock($1, $2) AS acquired`,
      [ADVISORY_NAMESPACE, ADVISORY_KEY_ATTENDANCE]
    );
    if (!got.rows[0]?.acquired) {
      logger.debug("[attendance-cron] another instance holds the lock, skipping");
      return null;
    }
    try {
      return await fn();
    } finally {
      await client.query(
        `SELECT pg_advisory_unlock($1, $2)`,
        [ADVISORY_NAMESPACE, ADVISORY_KEY_ATTENDANCE]
      ).catch(err => logger.error({ err }, "[attendance-cron] failed to release advisory lock"));
    }
  } finally {
    client.release();
  }
}

async function runAttendanceSweep(): Promise<void> {
  if (!pool) return;

  await withAdvisoryLock(async () => {
    // Barrido 0: Nivel 1 técnico — LiveKit detectó que ambos se conectaron y la
    // duración real fue ≥50% de la clase. Confianza alta de que la clase
    // ocurrió. Solo aplica a clases que NO estén ya en flujo de confirmación.
    try {
      await pool!.query(`
        UPDATE classes
        SET status = 'completed',
            confirmation_status = 'auto',
            tutor_confirmation = 'attended'
        WHERE status = 'scheduled'
          AND confirmation_status IS NULL
          AND livekit_room_name IS NOT NULL
          AND joined_at_tutor IS NOT NULL
          AND joined_at_student IS NOT NULL
          AND scheduled_at + (duration * interval '1 minute') < NOW()
          AND (
            EXTRACT(EPOCH FROM (
              COALESCE(left_at_tutor, NOW()) - joined_at_tutor
            )) >= duration * 60 * 0.5
            OR EXTRACT(EPOCH FROM (
              COALESCE(left_at_student, NOW()) - joined_at_student
            )) >= duration * 60 * 0.5
          )
          AND is_trial IS NOT TRUE
      `);
    } catch (err) {
      logger.error({ err }, "[attendance-cron] Sweep 0 (livekit auto) failed");
    }

    // Barrido 1: clases que terminaron y aún no entran al flujo de confirmación.
    // El UPDATE es atómico vs Sweep 0 — si Sweep 0 ya marcó 'auto' la fila no
    // matchea WHERE confirmation_status IS NULL.
    let started1: { id: number; tutor_id: number; user_id: number; scheduled_at: Date }[] = [];
    try {
      const result = await pool!.query<{ id: number; tutor_id: number; user_id: number; scheduled_at: Date }>(`
        UPDATE classes
        SET confirmation_status = 'pending_tutor',
            tutor_confirmation_deadline = NOW() + ($1 || ' hours')::interval
        WHERE status = 'scheduled'
          AND confirmation_status IS NULL
          AND scheduled_at + (duration * interval '1 minute') < NOW()
          AND is_trial IS NOT TRUE
        RETURNING id, tutor_id, user_id, scheduled_at
      `, [TUTOR_DEADLINE_HOURS]);
      started1 = result.rows;
    } catch (err) {
      logger.error({ err }, "[attendance-cron] Sweep 1 failed");
    }

    for (const row of started1) {
      notificationService.onAttendanceConfirmationNeeded({
        to: "tutor",
        classId: row.id,
        tutorId: row.tutor_id,
        studentId: row.user_id,
        scheduledAt: new Date(row.scheduled_at),
      }).catch(err => logger.error({ err, classId: row.id }, "[attendance-cron] notify tutor failed"));
    }

    // Barrido 2: tutor no respondió en 24h → refund + cancelled.
    // Atomic per-class: lock the row with FOR UPDATE SKIP LOCKED, refund,
    // verify the user's credit was incremented, then mark cancelled. If the
    // refund verification fails we DO NOT mark the class — leaves it for the
    // next sweep to retry. Prevents the "stuck in no_show_refunded with no
    // credit returned" silent-failure bug.
    let toRefund: { id: number; user_id: number; tutor_id: number; scheduled_at: Date }[] = [];
    try {
      const result = await pool!.query<{ id: number; user_id: number; tutor_id: number; scheduled_at: Date }>(`
        SELECT id, user_id, tutor_id, scheduled_at FROM classes
        WHERE confirmation_status = 'pending_tutor'
          AND tutor_confirmation_deadline < NOW()
      `);
      toRefund = result.rows;
    } catch (err) {
      logger.error({ err }, "[attendance-cron] Sweep 2 select failed");
    }

    for (const row of toRefund) {
      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        // Lock the class row to prevent concurrent state changes (e.g. tutor
        // confirming attendance at the exact moment the cron is refunding).
        const lockRes = await client.query<{
          confirmation_status: string;
        }>(
          `SELECT confirmation_status FROM classes WHERE id = $1 FOR UPDATE`,
          [row.id]
        );
        if (lockRes.rows[0]?.confirmation_status !== "pending_tutor") {
          // State changed under us — tutor confirmed concurrently. Skip.
          await client.query("ROLLBACK");
          continue;
        }
        // Refund credit atomically and read the new balance back to verify.
        const refund = await client.query<{ class_credits: number | null }>(
          `UPDATE users SET class_credits = COALESCE(class_credits, 0) + 1
            WHERE id = $1 RETURNING class_credits`,
          [row.user_id]
        );
        if (!refund.rows[0]) {
          await client.query("ROLLBACK");
          logger.error({ classId: row.id, userId: row.user_id },
            "[attendance-cron] refund: user not found, skipping");
          continue;
        }
        await client.query(
          `UPDATE classes
              SET status='cancelled',
                  confirmation_status='no_show_refunded',
                  tutor_confirmation = COALESCE(tutor_confirmation, 'no_show')
            WHERE id=$1`,
          [row.id]
        );
        await client.query("COMMIT");
        notificationService.onClassCancelled({
          studentId: row.user_id,
          tutorId: row.tutor_id,
          scheduledAt: new Date(row.scheduled_at),
        }).catch(err => logger.error({ err, classId: row.id }, "[attendance-cron] notify cancel failed"));
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        logger.error({ err, classId: row.id }, "[attendance-cron] refund transaction failed");
      } finally {
        client.release();
      }
    }

    // Barrido 3: estudiante no respondió en 48h → auto-completed.
    try {
      const result = await pool!.query<{ id: number; user_id: number; tutor_id: number; scheduled_at: Date }>(`
        UPDATE classes
        SET status='completed', confirmation_status='confirmed'
        WHERE confirmation_status = 'pending_student'
          AND student_confirmation_deadline < NOW()
        RETURNING id, user_id, tutor_id, scheduled_at
      `);
      for (const row of result.rows) {
        notificationService.onClassCompleted({
          studentId: row.user_id,
          tutorId: row.tutor_id,
          scheduledAt: new Date(row.scheduled_at),
        }).catch(err => logger.error({ err, classId: row.id }, "[attendance-cron] notify completed failed"));
      }
    } catch (err) {
      logger.error({ err }, "[attendance-cron] Sweep 3 failed");
    }
  });
}

export function startAttendanceCron(): void {
  if (started) return;
  started = true;
  runAttendanceSweep().catch(err => logger.error({ err }, "[attendance-cron] initial sweep failed"));
  setInterval(() => {
    runAttendanceSweep().catch(err => logger.error({ err }, "[attendance-cron] sweep failed"));
  }, SWEEP_INTERVAL_MS);
  logger.info({ intervalMin: SWEEP_INTERVAL_MS / 60000 }, "[attendance-cron] started");
}
