import * as Sentry from "@sentry/node";
import { logger } from "./logger";

let initialized = false;

export function isSentryInitialized(): boolean {
  return initialized;
}

/**
 * Initialize Sentry for the backend. No-op if SENTRY_DSN is not set.
 * Must be called BEFORE registering any Express middleware so the request
 * handler can wrap the entire request lifecycle.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry: SENTRY_DSN not set, skipping initialization");
    return;
  }
  if (initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.RAILWAY_GIT_COMMIT_SHA || "local",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Don't track health checks or static asset requests as transactions
    ignoreTransactions: ["GET /api/health", "GET /assets/*"],
    beforeSend(event, hint) {
      // Drop noisy errors that are not actionable
      const err = hint?.originalException as Error | undefined;
      if (err?.message?.includes("ECONNRESET")) return null;
      if (err?.message?.includes("ETIMEDOUT")) return null;
      return event;
    },
  });

  initialized = true;
  logger.info({ env: process.env.NODE_ENV }, "Sentry initialized");
}

export { Sentry };
