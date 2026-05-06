import type { Express } from "express";
import express from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { storage } from "../storage";
import { requireAuth } from "./auth";
import {
  createJoinToken,
  isLivekitConfigured,
  isRecordingConfigured,
  startRecording,
  endRoom,
  parseIdentity,
  getLivekitUrl,
  roomNameForClass,
} from "../services/livekit";
import { isFeatureEnabled } from "../services/feature-flags";
import { hasUserConsented } from "../services/recording-consent";
import { logger } from "../services/logger";

const FLAG_KEY = "livekit_classroom";

export function registerLivekitRoutes(app: Express) {
  // Status endpoint — frontend asks "should I show the LiveKit join button
  // for this user/class, or fall back to Google Meet?"
  app.get("/api/livekit/status/:classId", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const userId = req.session.userId!;
      const cls = await storage.getClassById(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const tutor = await storage.getTutorByUserId(userId);
      const isTutor = !!tutor && cls.tutorId === tutor.id;
      const isStudent = cls.userId === userId;
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "Not a participant" });
      }

      const flagOn = await isFeatureEnabled(FLAG_KEY, userId);
      const livekitOk = isLivekitConfigured();
      const consented = await hasUserConsented(userId, classId);

      res.json({
        livekitAvailable: flagOn && livekitOk,
        livekitConfigured: livekitOk,
        flagEnabled: flagOn,
        recordingEnabled: isRecordingConfigured(),
        consented,
        fallbackMeetingLink: cls.meetingLink || null,
        role: isTutor ? "tutor" : "student",
      });
    } catch (err) {
      console.error("livekit status error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Token endpoint — gates: feature flag on + consent given + auth + participant
  app.post("/api/livekit/token/:classId", requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const userId = req.session.userId!;

      if (!isLivekitConfigured()) {
        return res.status(503).json({ message: "LiveKit not configured" });
      }
      const flagOn = await isFeatureEnabled(FLAG_KEY, userId);
      if (!flagOn) {
        return res.status(403).json({ message: "LiveKit classroom not enabled for your account" });
      }

      const cls = await storage.getClassById(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const tutor = await storage.getTutorByUserId(userId);
      const isTutor = !!tutor && cls.tutorId === tutor.id;
      const isStudent = cls.userId === userId;
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "Not a participant" });
      }

      // If recording is configured, require consent. Without recording (e.g.
      // dry-run testing), allow joining without the consent gate.
      if (isRecordingConfigured()) {
        const ok = await hasUserConsented(userId, classId);
        if (!ok) return res.status(412).json({ message: "Recording consent required" });
      }

      const user = await storage.getUser(userId);
      const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : `User ${userId}`;

      const token = await createJoinToken({
        classId,
        userId,
        role: isTutor ? "tutor" : "student",
        displayName,
        scheduledAt: new Date(cls.scheduledAt),
        durationMinutes: cls.duration || 60,
      });

      // Persist roomName on first token issued
      if (!cls.livekitRoomName) {
        try {
          const { pool } = await import("../db");
          if (pool) {
            await pool.query(
              `UPDATE classes SET livekit_room_name = $1 WHERE id = $2 AND livekit_room_name IS NULL`,
              [token.roomName, classId]
            );
          }
        } catch (err) {
          logger.warn({ err, classId }, "could not persist livekit_room_name");
        }
      }

      res.json({ token: token.token, url: token.url, roomName: token.roomName });
    } catch (err) {
      console.error("livekit token error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // LiveKit webhook receiver. LiveKit signs requests with API key/secret;
  // WebhookReceiver verifies and parses. Set LiveKit project webhook URL to
  // POST https://portal.passport2fluency.com/api/livekit/webhook
  // Using express.raw because the WebhookReceiver needs the unparsed body.
  app.post("/api/livekit/webhook", express.raw({ type: "application/webhook+json" }), async (req, res) => {
    if (!isLivekitConfigured()) return res.status(204).end();
    try {
      const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
      const auth = req.get("Authorization") || "";
      const event = await receiver.receive(req.body.toString("utf-8"), auth);
      const { pool } = await import("../db");
      if (!pool) return res.status(204).end();

      const room = event.room?.name;
      const m = room ? /^p2f-class-(\d+)$/.exec(room) : null;
      const classId = m ? parseInt(m[1]) : null;

      if (!classId) {
        return res.status(204).end();
      }

      switch (event.event) {
        case "participant_joined": {
          const idn = event.participant?.identity ? parseIdentity(event.participant.identity) : null;
          if (!idn) break;
          const col = idn.role === "tutor" ? "joined_at_tutor" : "joined_at_student";
          await pool.query(
            `UPDATE classes SET ${col} = COALESCE(${col}, NOW()) WHERE id = $1`,
            [classId]
          );

          // Auto-start recording when both parties are present and recording
          // is configured. Idempotent — only fires if recording_started_at is null.
          if (isRecordingConfigured()) {
            const r = await pool.query<{
              joined_at_tutor: Date | null;
              joined_at_student: Date | null;
              recording_started_at: Date | null;
            }>(`SELECT joined_at_tutor, joined_at_student, recording_started_at FROM classes WHERE id = $1`, [classId]);
            const row = r.rows[0];
            if (row?.joined_at_tutor && row?.joined_at_student && !row.recording_started_at) {
              try {
                await startRecording(classId);
                await pool.query(`UPDATE classes SET recording_started_at = NOW() WHERE id = $1`, [classId]);
                logger.info({ classId }, "Recording started — both participants present");
              } catch (err) {
                logger.error({ err, classId }, "Failed to start recording");
              }
            }
          }
          break;
        }
        case "participant_left": {
          const idn = event.participant?.identity ? parseIdentity(event.participant.identity) : null;
          if (!idn) break;
          const col = idn.role === "tutor" ? "left_at_tutor" : "left_at_student";
          await pool.query(
            `UPDATE classes SET ${col} = NOW() WHERE id = $1`,
            [classId]
          );
          break;
        }
        case "egress_ended": {
          const fileResults = (event.egressInfo as any)?.fileResults || [];
          const file = fileResults[0];
          if (file?.location) {
            await pool.query(
              `UPDATE classes
                  SET recording_url = $1,
                      recording_finished_at = NOW(),
                      recording_duration_seconds = $2
                WHERE id = $3`,
              [file.location, Math.round((file.duration || 0) / 1_000_000_000), classId]
            );
            logger.info({ classId, location: file.location }, "Recording finished — URL persisted");
          }
          break;
        }
        case "room_finished": {
          // Both participants gone. Egress will end on its own; nothing to do here.
          logger.info({ classId }, "Room finished");
          break;
        }
      }

      res.status(204).end();
    } catch (err) {
      logger.error({ err }, "LiveKit webhook processing failed");
      res.status(500).json({ message: "Webhook error" });
    }
  });

  // Admin: force-end a stuck class room
  app.post("/api/admin/livekit/end-room/:classId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const u = await storage.getUser(userId);
      if (u?.userType !== "admin") return res.status(403).json({ message: "Forbidden" });
      const classId = parseInt(req.params.classId);
      await endRoom(classId);
      res.json({ ok: true });
    } catch (err) {
      console.error("livekit end-room error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Frontend uses this to know the LiveKit websocket URL without baking it
  // into the bundle (same pattern as Sentry DSN runtime config).
  app.get("/api/livekit/config", (_req, res) => {
    res.json({
      url: getLivekitUrl() || null,
      configured: isLivekitConfigured(),
      recordingEnabled: isRecordingConfigured(),
    });
  });
}
