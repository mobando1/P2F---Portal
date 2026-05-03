import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

// In dev, pretty-print to terminal. In prod, NDJSON for log aggregation.
const transport = !isProd
  ? {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
    }
  : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  base: { env: isProd ? "production" : "development" },
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.token",
      "*.password",
      "*.apiKey",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
  transport,
});

/**
 * HTTP request logger middleware. Adds a unique traceId to each request and
 * exposes it as req.log so any handler can call req.log.info({ ... }).
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    const existing = req.headers["x-request-id"];
    return typeof existing === "string" ? existing : randomUUID();
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      userId: (req as any).session?.userId,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

/**
 * Convenience: attach req.id back to the response header so clients/curl can
 * include the traceId when reporting bugs.
 */
export function traceIdHeader(req: Request, res: Response, next: NextFunction) {
  if ((req as any).id) res.setHeader("x-request-id", (req as any).id);
  next();
}
