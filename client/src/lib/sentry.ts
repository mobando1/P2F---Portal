import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for the React frontend. Tries to get the DSN from two
 * sources, in order:
 *   1. Build-time: import.meta.env.VITE_SENTRY_DSN (works if Vite saw the var
 *      at build time — Docker builds often don't unless ARG is declared).
 *   2. Runtime: GET /api/config/public on the same origin (always works).
 *
 * Async because it may need the network. Calls Sentry.init() once the DSN is
 * resolved. Safe to call before mounting React — captureException calls made
 * before init are queued briefly and replayed.
 */
export async function initSentry(): Promise<void> {
  let dsn = (import.meta.env as any).VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    try {
      const res = await fetch("/api/config/public", { credentials: "omit" });
      if (res.ok) {
        const data = await res.json();
        dsn = data?.sentryDsn || undefined;
      }
    } catch {
      // Network or backend down — Sentry stays disabled, app keeps working
    }
  }

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env as any).VITE_RAILWAY_GIT_COMMIT_SHA || "local",
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}

export { Sentry };
