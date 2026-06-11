import type { Request, Response, NextFunction } from "express";

/**
 * Shared-secret guard for public server-to-server endpoints called by the
 * marketing website. Validates the `x-api-key` header against LEADS_API_KEY.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.LEADS_API_KEY;
  if (!expected) {
    console.error("[apiKey] LEADS_API_KEY not configured — rejecting request");
    return res.status(503).json({ success: false, message: "Public API not configured" });
  }
  const provided = req.header("x-api-key");
  if (provided !== expected) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}
