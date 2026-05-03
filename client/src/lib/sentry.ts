import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for the React frontend. No-op if VITE_SENTRY_DSN is unset
 * (typical in local dev / preview).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RAILWAY_GIT_COMMIT_SHA || "local",
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,    // Off by default — turn on later if needed
    replaysOnErrorSampleRate: 0.1,  // Capture replay only when error happens
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}

export { Sentry };
