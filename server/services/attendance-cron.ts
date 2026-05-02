import { pool } from "../db";
import { storage } from "../storage";
import { notificationService } from "./notification";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const TUTOR_DEADLINE_HOURS = 24;

let started = false;

async function runAttendanceSweep(): Promise<void> {
  if (!pool) return;

  // Barrido 1: clases que terminaron y aún no entran al flujo de confirmación
  // Excluye clases con confirmation_status='auto' (Nivel 1: tutor ya dejó notas)
  let started1: { id: number; tutor_id: number; user_id: number; scheduled_at: Date }[] = [];
  try {
    const result = await pool.query<{ id: number; tutor_id: number; user_id: number; scheduled_at: Date }>(`
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
    console.error("[attendance-cron] Sweep 1 failed:", err);
  }

  for (const row of started1) {
    notificationService.onAttendanceConfirmationNeeded({
      to: "tutor",
      classId: row.id,
      tutorId: row.tutor_id,
      studentId: row.user_id,
      scheduledAt: new Date(row.scheduled_at),
    }).catch(err => console.error("[attendance-cron] notify tutor failed:", err));
  }

  // Barrido 2: tutor no respondió en 24h → refund + cancelled
  let toRefund: { id: number; user_id: number; tutor_id: number; scheduled_at: Date }[] = [];
  try {
    const result = await pool.query<{ id: number; user_id: number; tutor_id: number; scheduled_at: Date }>(`
      SELECT id, user_id, tutor_id, scheduled_at FROM classes
      WHERE confirmation_status = 'pending_tutor'
        AND tutor_confirmation_deadline < NOW()
    `);
    toRefund = result.rows;
  } catch (err) {
    console.error("[attendance-cron] Sweep 2 select failed:", err);
  }

  for (const row of toRefund) {
    try {
      await storage.refundClassCredit(row.user_id);
      await pool.query(
        `UPDATE classes SET status='cancelled', confirmation_status='no_show_refunded' WHERE id=$1`,
        [row.id]
      );
      notificationService.onClassCancelled({
        studentId: row.user_id,
        tutorId: row.tutor_id,
        scheduledAt: new Date(row.scheduled_at),
      }).catch(err => console.error("[attendance-cron] notify cancel failed:", err));
    } catch (err) {
      console.error(`[attendance-cron] refund failed for class ${row.id}:`, err);
    }
  }

  // Barrido 3: estudiante no respondió en 48h → auto-completed (silencio = aceptación)
  try {
    const result = await pool.query<{ id: number; user_id: number; tutor_id: number; scheduled_at: Date }>(`
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
      }).catch(err => console.error("[attendance-cron] notify completed failed:", err));
    }
  } catch (err) {
    console.error("[attendance-cron] Sweep 3 failed:", err);
  }
}

export function startAttendanceCron(): void {
  if (started) return;
  started = true;
  // Run once at boot, then on interval
  runAttendanceSweep().catch(err => console.error("[attendance-cron] initial sweep failed:", err));
  setInterval(() => {
    runAttendanceSweep().catch(err => console.error("[attendance-cron] sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
  console.log(`[attendance-cron] started, sweeping every ${SWEEP_INTERVAL_MS / 60000} min`);
}
