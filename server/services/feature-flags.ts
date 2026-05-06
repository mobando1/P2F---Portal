import { pool } from "../db";
import { logger } from "./logger";
import crypto from "crypto";
import type { PoolClient } from "pg";

interface CachedFlag {
  enabled: boolean;
  rolloutPercentage: number;
  userOverrides: number[];
}

const CACHE_TTL_MS = 60 * 1000;
const NOTIFY_CHANNEL = "feature_flags_changed";
let cache: Map<string, CachedFlag> | null = null;
let cacheLoadedAt = 0;
let cacheLoading: Promise<void> | null = null;
let listenerStarted = false;
let listenerClient: PoolClient | null = null;

/**
 * Long-lived LISTEN client that picks up NOTIFY 'feature_flags_changed'
 * broadcasts and invalidates the in-memory cache across every replica.
 * Without this, two Railway instances can serve a stale flag value for up
 * to 60s after an admin toggles it. With this, propagation is sub-second.
 */
async function ensureListener(): Promise<void> {
  if (listenerStarted || !pool) return;
  listenerStarted = true;
  try {
    listenerClient = await pool.connect();
    listenerClient.on("notification", (msg) => {
      if (msg.channel === NOTIFY_CHANNEL) {
        invalidateFeatureFlagCache();
      }
    });
    listenerClient.on("error", (err) => {
      logger.error({ err }, "feature-flags listener errored, will reconnect");
      try { listenerClient?.release(true); } catch { /* ignore */ }
      listenerClient = null;
      listenerStarted = false;
      // Reconnect on next ensureCache() call; meanwhile other replicas/timers
      // still keep the cache from going totally stale via the 60s TTL.
    });
    await listenerClient.query(`LISTEN ${NOTIFY_CHANNEL}`);
    logger.info("feature-flags: LISTEN channel established");
  } catch (err) {
    logger.error({ err }, "feature-flags: failed to start listener");
    listenerStarted = false;
    try { listenerClient?.release(true); } catch { /* ignore */ }
    listenerClient = null;
  }
}

async function loadCache(): Promise<void> {
  if (!pool) {
    cache = new Map();
    cacheLoadedAt = Date.now();
    return;
  }
  try {
    const r = await pool.query<{
      key: string;
      enabled: boolean;
      rollout_percentage: number;
      user_overrides: number[] | null;
    }>(`SELECT key, enabled, rollout_percentage, user_overrides FROM feature_flags`);
    const next = new Map<string, CachedFlag>();
    for (const row of r.rows) {
      next.set(row.key, {
        enabled: row.enabled,
        rolloutPercentage: row.rollout_percentage,
        userOverrides: row.user_overrides || [],
      });
    }
    cache = next;
    cacheLoadedAt = Date.now();
  } catch (err) {
    logger.error({ err }, "feature-flags: failed to load cache");
    cache = cache || new Map();
    cacheLoadedAt = Date.now();
  }
}

async function ensureCache(): Promise<void> {
  await ensureListener();
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return;
  if (cacheLoading) return cacheLoading;
  cacheLoading = loadCache().finally(() => { cacheLoading = null; });
  return cacheLoading;
}

export function invalidateFeatureFlagCache() {
  cache = null;
  cacheLoadedAt = 0;
}

/**
 * Returns true if the feature is enabled for this user. Deterministic: a given
 * userId+key pair always falls on the same side of the rollout, so a user
 * doesn't see the feature flicker on/off across requests.
 *
 * Resolution order:
 *   1. Flag doesn't exist → false (fail closed)
 *   2. enabled=false → false
 *   3. user is in user_overrides → true
 *   4. rolloutPercentage = 0 → false
 *   5. rolloutPercentage = 100 → true
 *   6. otherwise: deterministic bucket of (key + userId) vs percentage
 */
export async function isFeatureEnabled(key: string, userId?: number): Promise<boolean> {
  await ensureCache();
  const flag = cache?.get(key);
  if (!flag || !flag.enabled) return false;
  if (userId !== undefined && flag.userOverrides.includes(userId)) return true;
  if (flag.rolloutPercentage <= 0) return false;
  if (flag.rolloutPercentage >= 100) return true;
  if (userId === undefined) return false; // anonymous users excluded from gradual rollout
  const hash = crypto.createHash("sha1").update(`${key}:${userId}`).digest();
  const bucket = hash.readUInt32BE(0) % 100;
  return bucket < flag.rolloutPercentage;
}

/**
 * Returns the full set of flags evaluated for a given user. Used by the
 * frontend to know what's on/off without making one request per flag.
 */
export async function evaluateAllFlags(userId?: number): Promise<Record<string, boolean>> {
  await ensureCache();
  const out: Record<string, boolean> = {};
  if (!cache) return out;
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    out[key] = await isFeatureEnabled(key, userId);
  }
  return out;
}

export async function listFlags(): Promise<Array<{
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  userOverrides: number[];
  description: string | null;
  updatedAt: Date;
}>> {
  if (!pool) return [];
  const r = await pool.query(`
    SELECT key, enabled, rollout_percentage, user_overrides, description, updated_at
      FROM feature_flags ORDER BY key ASC
  `);
  return r.rows.map((row: any) => ({
    key: row.key,
    enabled: row.enabled,
    rolloutPercentage: row.rollout_percentage,
    userOverrides: row.user_overrides || [],
    description: row.description,
    updatedAt: row.updated_at,
  }));
}

export async function upsertFlag(input: {
  key: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  userOverrides?: number[];
  description?: string | null;
  updatedBy?: number;
}): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO feature_flags (key, enabled, rollout_percentage, user_overrides, description, updated_by, updated_at)
     VALUES ($1, COALESCE($2, false), COALESCE($3, 0), COALESCE($4, '{}'::int[]), $5, $6, NOW())
     ON CONFLICT (key) DO UPDATE SET
       enabled = COALESCE($2, feature_flags.enabled),
       rollout_percentage = COALESCE($3, feature_flags.rollout_percentage),
       user_overrides = COALESCE($4, feature_flags.user_overrides),
       description = COALESCE($5, feature_flags.description),
       updated_by = $6,
       updated_at = NOW()`,
    [
      input.key,
      input.enabled ?? null,
      input.rolloutPercentage ?? null,
      input.userOverrides ?? null,
      input.description ?? null,
      input.updatedBy ?? null,
    ]
  );
  invalidateFeatureFlagCache();
  // Broadcast to all replicas listening on the channel.
  await pool.query(`SELECT pg_notify($1, $2)`, [NOTIFY_CHANNEL, input.key]).catch(() => {});
}

export async function deleteFlag(key: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM feature_flags WHERE key = $1`, [key]);
  invalidateFeatureFlagCache();
  await pool.query(`SELECT pg_notify($1, $2)`, [NOTIFY_CHANNEL, key]).catch(() => {});
}
