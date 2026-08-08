import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireTutor, requireAuth, requireAdmin } from "./auth";
import { logger } from "../services/logger";
import {
  ingestTranscript,
  getLatestTranscript,
  listTranscriptMeta,
  ConsentMissingError,
  MIN_TRANSCRIPT_CHARS,
  MAX_TRANSCRIPT_CHARS,
} from "../services/transcripts";
import { saveAssessment, getAssessmentForClass, getAssessmentSeries } from "../services/assessments";
import { getIntakeForClass, summarizeIntake } from "../services/intake";
import { recordConsent } from "../services/recording-consent";
import {
  generateStudyPlan,
  buildPrompt,
  countPromptTokens,
  getActivePlanForClass,
  getPlanById,
  getPlanByShareToken,
  saveCoachEdit,
  markSent,
  PlanGenerationError,
} from "../services/study-plan";
import { studyPlanSchema } from "@shared/study-plan-schema";
import { DIAGNOSTIC_SCRIPT, COACH_RULES, CLOSING_SCRIPT, RUBRIC_SKILLS, TARGET_TASK_RESULTS } from "../services/diagnostic-script";
import { emailService } from "../services/email";

/**
 * The diagnostic → Flight Plan pipeline, over HTTP.
 *
 * Coach-facing: read the briefing, paste the transcript, score the rubric,
 * generate the plan, edit it, send it.
 * Student-facing: one public endpoint that resolves a share token.
 *
 * The student never gets the raw transcript — a verbatim recording of someone's
 * language mistakes is a liability surface with no upside. They get the plan.
 */

export function registerDiagnosticRoutes(app: Express) {
  /* ── Coach: the class protocol ─────────────────────────────────────── */

  app.get("/api/tutor/diagnostic-script", requireTutor, async (req: Request, res: Response) => {
    const lang = req.query.lang === "en" ? "en" : "es";
    res.json({
      blocks: DIAGNOSTIC_SCRIPT[lang],
      rules: COACH_RULES[lang],
      closing: CLOSING_SCRIPT[lang],
      rubricSkills: RUBRIC_SKILLS.map((s) => ({ id: s.id, label: s.label[lang], evidenceFrom: s.evidenceFrom })),
      targetTaskResults: TARGET_TASK_RESULTS.map((r) => ({ id: r.id, label: r.label[lang] })),
    });
  });

  /* ── Coach: the pre-class briefing ─────────────────────────────────── */

  app.get("/api/tutor/classes/:id/briefing", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await assertOwnedClass(req, res, classId);
    if (!cls) return;

    const intake = await getIntakeForClass(classId, cls.userId);
    const student = await storage.getUser(cls.userId);
    const plan = await getActivePlanForClass(classId);
    const transcripts = await listTranscriptMeta(classId);

    res.json({
      classId,
      isDiagnostic: !!cls.isTrial,
      student: student
        ? { firstName: student.firstName, email: student.email, phone: student.phone, level: student.level }
        : null,
      intake: intake
        ? {
            goal: intake.goal,
            goalCategory: intake.goalCategory,
            selfLevel: intake.selfLevel,
            blocker: intake.blocker,
            summary: summarizeIntake(intake, "es"),
          }
        : null,
      hasTranscript: transcripts.length > 0,
      transcripts,
      planStatus: plan?.status ?? null,
      planId: plan?.id ?? null,
    });
  });

  /* ── Coach: transcript ingestion (manual v1) ───────────────────────── */

  const transcriptSchema = z.object({
    content: z.string().min(MIN_TRANSCRIPT_CHARS).max(MAX_TRANSCRIPT_CHARS),
    format: z.enum(["plain", "vtt", "srt"]).optional(),
  });

  app.post("/api/tutor/classes/:id/transcript", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await assertOwnedClass(req, res, classId);
    if (!cls) return;

    try {
      const body = transcriptSchema.parse(req.body);
      const [student, tutor] = await Promise.all([
        storage.getUser(cls.userId),
        cls.tutorId ? storage.getTutor(cls.tutorId) : Promise.resolve(undefined),
      ]);

      const stored = await ingestTranscript({
        classId,
        studentUserId: cls.userId,
        source: "manual_paste",
        content: body.content,
        format: body.format,
        uploadedByUserId: (req.session as any).userId,
        speakers: { tutorName: tutor?.name, studentName: student?.firstName },
      });

      // Echoed back so the coach sees immediately whether the paste looks right.
      res.status(201).json({
        transcriptId: stored.id,
        wordCount: stored.wordCount,
        language: stored.language,
        segmentCount: stored.segments?.length ?? 0,
        blocksDetected: stored.segments
          ? Array.from(new Set(stored.segments.map((s) => s.block).filter(Boolean)))
          : [],
      });
    } catch (err: any) {
      if (err instanceof ConsentMissingError) {
        return res.status(412).json({
          success: false,
          code: "consent_missing",
          message:
            "No hay consentimiento de grabación registrado para esta clase. Pídeselo al estudiante antes de subir la transcripción, o solicita un override a un admin.",
        });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      logger.error({ err, classId }, "Transcript ingestion failed");
      res.status(400).json({ success: false, message: err?.message || "Could not store the transcript" });
    }
  });

  app.get("/api/tutor/classes/:id/transcript", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    if (!(await assertOwnedClass(req, res, classId))) return;
    const t = await getLatestTranscript(classId);
    if (!t) return res.status(404).json({ success: false, message: "No transcript for this class" });
    res.json(t);
  });

  /* ── Coach: the rubric ─────────────────────────────────────────────── */

  const assessmentSchema = z.object({
    assessmentNumber: z.number().int().min(1).max(12).optional(),
    fluency: z.number().min(1).max(10),
    listening: z.number().min(1).max(10),
    lexicalRange: z.number().min(1).max(10),
    grammaticalAccuracy: z.number().min(1).max(10),
    confidence: z.number().min(1).max(10),
    targetTaskResult: z.enum(["failed", "heavy_help", "partial", "completed"]),
    cefrEstimate: z.string().max(8).optional(),
    notes: z.string().max(2000).optional(),
  });

  app.post("/api/tutor/classes/:id/assessment", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await assertOwnedClass(req, res, classId);
    if (!cls) return;
    try {
      const body = assessmentSchema.parse(req.body);
      const saved = await saveAssessment({
        ...body,
        classId,
        userId: cls.userId,
        assessedBy: (req.session as any).userId,
      });
      res.status(201).json(saved);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
      logger.error({ err, classId }, "Assessment save failed");
      res.status(500).json({ success: false, message: "Could not save the assessment" });
    }
  });

  app.get("/api/tutor/classes/:id/assessment", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await assertOwnedClass(req, res, classId);
    if (!cls) return;
    res.json({
      current: await getAssessmentForClass(classId),
      series: await getAssessmentSeries(cls.userId),
    });
  });

  /* ── Coach: generate, review, send ─────────────────────────────────── */

  app.post("/api/tutor/classes/:id/study-plan/generate", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await assertOwnedClass(req, res, classId);
    if (!cls) return;

    try {
      const ctx = await buildGenerateContext(cls);

      // ?dryRun=1 — assemble the prompt and count tokens without calling the
      // model. Verifies prompt assembly against a real transcript for free.
      if (req.query.dryRun === "1") {
        const { userPrompt, outputLanguage } = await buildPrompt(ctx);
        const tokens = await countPromptTokens(userPrompt);
        return res.json({ dryRun: true, outputLanguage, estimatedInputTokens: tokens, prompt: userPrompt });
      }

      const plan = await generateStudyPlan(ctx);
      res.status(201).json(plan);
    } catch (err: any) {
      if (err instanceof PlanGenerationError) {
        const status = err.reason === "budget_exceeded" ? 503 : 400;
        return res.status(status).json({ success: false, code: err.reason, message: err.message });
      }
      logger.error({ err, classId }, "Study plan generation failed");
      res.status(500).json({ success: false, message: "Could not generate the plan" });
    }
  });

  app.get("/api/tutor/classes/:id/study-plan", requireTutor, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    if (!(await assertOwnedClass(req, res, classId))) return;
    const plan = await getActivePlanForClass(classId);
    if (!plan) return res.status(404).json({ success: false, message: "No plan for this class" });
    res.json(plan);
  });

  app.patch("/api/tutor/study-plans/:id", requireTutor, async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id, 10);
    const plan = await getPlanById(planId);
    if (!plan?.classId) return res.status(404).json({ success: false, message: "Plan not found" });
    if (!(await assertOwnedClass(req, res, plan.classId))) return;

    try {
      const content = studyPlanSchema.parse(req.body.content);
      const saved = await saveCoachEdit(planId, content, (req.session as any).userId);
      if (!saved) {
        return res.status(409).json({ success: false, message: "Plan is not in an editable state" });
      }
      res.json(saved);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
      logger.error({ err, planId }, "Plan edit failed");
      res.status(500).json({ success: false, message: "Could not save the plan" });
    }
  });

  /**
   * Send the plan to the student. Only `reviewed → sent` dispatches the email —
   * a coach has to have looked at it. That review step is deliberate: the plan
   * is the product, manual Meet transcripts frequently mis-attribute speakers,
   * and the coach was in the room.
   */
  app.post("/api/tutor/study-plans/:id/send", requireTutor, async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id, 10);
    const plan = await getPlanById(planId);
    if (!plan?.classId) return res.status(404).json({ success: false, message: "Plan not found" });
    const cls = await assertOwnedClass(req, res, plan.classId);
    if (!cls) return;

    if (plan.status !== "reviewed") {
      return res.status(409).json({
        success: false,
        message: "Revisa el plan antes de enviarlo (status debe ser 'reviewed').",
      });
    }

    const sent = await markSent(planId);
    if (!sent?.shareToken || !sent.content) {
      return res.status(500).json({ success: false, message: "Could not mark the plan as sent" });
    }

    const [student, tutor] = await Promise.all([
      storage.getUser(plan.userId),
      cls.tutorId ? storage.getTutor(cls.tutorId) : Promise.resolve(undefined),
    ]);
    if (student?.email) {
      const appUrl = process.env.APP_URL || "https://portal.passport2fluency.com";
      emailService
        .sendStudyPlanReady({
          to: student.email,
          studentName: student.firstName || "",
          tutorName: tutor?.name || "Passport2Fluency",
          planHeadline: sent.content.headline,
          goalQuote: sent.content.goalInTheirWords,
          recommendationLine: `${sent.content.recommendation.sessionsPerWeek} × / semana · ${sent.content.recommendation.durationWeeks} semanas`,
          planUrl: `${appUrl}/plan/${sent.shareToken}`,
          lang: sent.language === "en" ? "en" : "es",
        })
        .catch((e) => logger.error({ e, planId }, "Plan delivery email failed"));
    }

    res.json({ success: true, plan: sent });
  });

  /* ── Student: the public plan page ─────────────────────────────────── */

  /**
   * Resolved by capability URL, not by login. The trial user has a random UUID
   * password they never chose — asking them to reset a password they don't know
   * they have, in order to read a free gift, loses most of them.
   *
   * The token exposes the student's own plan and first name. Nothing else is
   * reachable through it.
   */
  app.get("/api/public/study-plans/:token", async (req: Request, res: Response) => {
    const plan = await getPlanByShareToken(req.params.token);
    if (!plan || !plan.content) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    const student = await storage.getUser(plan.userId);
    const cls = plan.classId ? await storage.getClassById(plan.classId) : undefined;
    const tutor = cls?.tutorId ? await storage.getTutor(cls.tutorId) : undefined;

    // generationNotes and confidence are coach-only — never rendered to the student.
    const { generationNotes, confidence, ...studentFacing } = plan.content;

    res.json({
      plan: studentFacing,
      language: plan.language,
      studentFirstName: student?.firstName || "",
      coachName: tutor?.name || null,
      classDate: cls?.scheduledAt || null,
      version: plan.version,
      /** Whether they've already set a password — drives claim vs. sign-in CTA. */
      hasAccount: !!student?.emailVerified,
    });
  });

  /* ── Student: logged-in view ───────────────────────────────────────── */

  app.get("/api/study-plans/me", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const plan = await getLatestSentPlanForUser(userId);
    if (!plan?.content) return res.status(404).json({ success: false, message: "No plan yet" });
    const { generationNotes, confidence, ...studentFacing } = plan.content;
    res.json({ plan: studentFacing, language: plan.language, version: plan.version });
  });

  /* ── Admin ─────────────────────────────────────────────────────────── */

  /**
   * Consent override for verbal in-class consent. Because recording_consents
   * has a BEFORE UPDATE OR DELETE trigger, this is necessarily a NEW row — the
   * audit trail stays tamper-proof by construction.
   */
  app.post("/api/admin/classes/:id/consent-override", requireAdmin, async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id, 10);
    const cls = await storage.getClassById(classId);
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    await recordConsent({
      userId: cls.userId,
      classId,
      scope: "class",
      userAgent: `admin-override by user ${(req.session as any).userId}`,
    });
    res.json({ success: true });
  });

  app.get("/api/admin/diagnostics", requireAdmin, async (_req: Request, res: Response) => {
    res.json({ rows: await listDiagnostics() });
  });

  /* ── helpers ───────────────────────────────────────────────────────── */

  /**
   * Ownership check. Same pattern as the existing notes endpoints: a coach may
   * only touch classes on their own roster.
   */
  async function assertOwnedClass(req: Request, res: Response, classId: number) {
    if (!Number.isFinite(classId)) {
      res.status(400).json({ success: false, message: "Invalid class id" });
      return null;
    }
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    const cls = await storage.getClassById(classId);
    if (!cls) {
      res.status(404).json({ success: false, message: "Class not found" });
      return null;
    }
    if (user?.userType === "admin") return cls;

    const tutor = await storage.getTutorByUserId(userId);
    if (!tutor || cls.tutorId !== tutor.id) {
      res.status(403).json({ success: false, message: "Not your class" });
      return null;
    }
    return cls;
  }

  async function buildGenerateContext(cls: any) {
    const [student, tutor] = await Promise.all([
      storage.getUser(cls.userId),
      cls.tutorId ? storage.getTutor(cls.tutorId) : Promise.resolve(undefined),
    ]);
    return {
      classId: cls.id,
      userId: cls.userId,
      studentFirstName: student?.firstName || "",
      coachName: tutor?.name || "tu coach",
      classDate: new Date(cls.scheduledAt).toISOString().split("T")[0],
      classCategory: cls.classCategory ?? null,
      preferredLanguage: student?.preferredLanguage ?? null,
    };
  }
}

/* ── queries that don't belong to a single service ────────────────────── */

import { pool } from "../db";

async function getLatestSentPlanForUser(userId: number) {
  if (!pool) return null;
  const r = await pool.query(
    `SELECT * FROM study_plans WHERE user_id = $1 AND status = 'sent'
      ORDER BY version DESC LIMIT 1`,
    [userId],
  );
  const row = r.rows[0];
  return row ? { content: row.content, language: row.language, version: row.version } : null;
}

/**
 * The daily operating view: one row per diagnostic, from booking to purchase.
 * Answers "who needs a transcript / a review / a nudge" in a single query.
 */
async function listDiagnostics() {
  if (!pool) return [];
  const r = await pool.query(`
    SELECT
      c.id                AS class_id,
      c.scheduled_at,
      c.status            AS class_status,
      c.class_category,
      u.id                AS user_id,
      u.first_name, u.last_name, u.email, u.phone,
      u.user_type,
      u.converted_to_customer_at,
      t.name              AS coach_name,
      i.goal, i.goal_category, i.self_level,
      tr.word_count       AS transcript_words,
      sp.id               AS plan_id,
      sp.status           AS plan_status,
      sp.version          AS plan_version,
      sp.sent_at,
      sp.first_viewed_at,
      sp.content -> 'recommendation' ->> 'planTier' AS recommended_tier
    FROM classes c
    JOIN users u  ON u.id = c.user_id
    LEFT JOIN tutors t ON t.id = c.tutor_id
    LEFT JOIN LATERAL (
      SELECT * FROM intake_responses WHERE class_id = c.id ORDER BY created_at DESC LIMIT 1
    ) i ON TRUE
    LEFT JOIN LATERAL (
      SELECT * FROM class_transcripts WHERE class_id = c.id ORDER BY created_at DESC LIMIT 1
    ) tr ON TRUE
    LEFT JOIN LATERAL (
      SELECT * FROM study_plans WHERE class_id = c.id AND status NOT IN ('superseded','failed')
      ORDER BY version DESC LIMIT 1
    ) sp ON TRUE
    WHERE c.is_trial = TRUE
    ORDER BY c.scheduled_at DESC
    LIMIT 500
  `);
  return r.rows;
}
