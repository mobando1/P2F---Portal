import { AccessToken, RoomServiceClient, EgressClient, EncodedFileType, EncodedFileOutput } from "livekit-server-sdk";
import { logger } from "./logger";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;          // wss://your-project.livekit.cloud
const LIVEKIT_HTTP_URL = process.env.LIVEKIT_HTTP_URL; // https://your-project.livekit.cloud

const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;          // https://<account>.r2.cloudflarestorage.com

export function isLivekitConfigured(): boolean {
  return Boolean(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
}

export function isRecordingConfigured(): boolean {
  return Boolean(R2_BUCKET && R2_ACCESS_KEY && R2_SECRET_KEY && R2_ENDPOINT);
}

export function getLivekitUrl(): string | undefined {
  return LIVEKIT_URL;
}

export function roomNameForClass(classId: number): string {
  return `p2f-class-${classId}`;
}

/**
 * Generate a JWT for joining a class room. Identity = `userId:role` so
 * webhooks can map participant_joined events back to a user. TTL is
 * scheduledAt - 10min to scheduledAt + duration + 30min, capped at 4 hours.
 */
export async function createJoinToken(opts: {
  classId: number;
  userId: number;
  role: "tutor" | "student";
  displayName: string;
  scheduledAt: Date;
  durationMinutes: number;
}): Promise<{ token: string; url: string; roomName: string }> {
  if (!isLivekitConfigured()) {
    throw new Error("LiveKit not configured (LIVEKIT_API_KEY / SECRET / URL missing)");
  }
  const roomName = roomNameForClass(opts.classId);

  // Token valid from 10 min before class until 30 min after the scheduled end.
  const startBuffer = 10 * 60 * 1000;
  const endBuffer = 30 * 60 * 1000;
  const validFrom = new Date(opts.scheduledAt.getTime() - startBuffer);
  const validUntil = new Date(opts.scheduledAt.getTime() + opts.durationMinutes * 60 * 1000 + endBuffer);
  const ttlSeconds = Math.min(4 * 60 * 60, Math.max(60, Math.floor((validUntil.getTime() - Date.now()) / 1000)));

  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
    identity: `${opts.userId}:${opts.role}`,
    name: opts.displayName,
    ttl: ttlSeconds,
    metadata: JSON.stringify({ userId: opts.userId, role: opts.role, classId: opts.classId }),
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return { token: await at.toJwt(), url: LIVEKIT_URL!, roomName };
}

/**
 * Start cloud recording (composite of all participants) and stream it directly
 * to Cloudflare R2 via the S3-compatible egress output. The recording lands
 * at `class-{id}/recording-{timestamp}.mp4`.
 */
export async function startRecording(classId: number): Promise<{ egressId: string; objectKey: string } | null> {
  if (!isLivekitConfigured() || !isRecordingConfigured() || !LIVEKIT_HTTP_URL) {
    logger.warn({ classId }, "Recording skipped — LiveKit or R2 not fully configured");
    return null;
  }
  const egressClient = new EgressClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  const roomName = roomNameForClass(classId);
  const objectKey = `class-${classId}/recording-${Date.now()}.mp4`;

  const fileOutput = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: objectKey,
    output: {
      case: "s3",
      value: {
        accessKey: R2_ACCESS_KEY!,
        secret: R2_SECRET_KEY!,
        bucket: R2_BUCKET!,
        endpoint: R2_ENDPOINT!,
        forcePathStyle: true,
      },
    },
  });

  const info = await egressClient.startRoomCompositeEgress(roomName, { file: fileOutput }, {
    layout: "speaker",
  });
  return { egressId: info.egressId, objectKey };
}

export async function endRoom(classId: number): Promise<void> {
  if (!isLivekitConfigured() || !LIVEKIT_HTTP_URL) return;
  const svc = new RoomServiceClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  try {
    await svc.deleteRoom(roomNameForClass(classId));
  } catch (err) {
    logger.warn({ err, classId }, "endRoom: deleteRoom failed (room may already be gone)");
  }
}

export interface ParsedIdentity {
  userId: number;
  role: "tutor" | "student";
}
export function parseIdentity(identity: string): ParsedIdentity | null {
  const m = /^(\d+):(tutor|student)$/.exec(identity);
  if (!m) return null;
  return { userId: parseInt(m[1]), role: m[2] as "tutor" | "student" };
}
