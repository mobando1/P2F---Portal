import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Shared-secret guard for public server-to-server endpoints called by the
 * marketing website. Validates the `x-api-key` header.
 *
 * NAME MISMATCH: the website calls this secret PORTAL_API_KEY; the Portal has
 * always called it LEADS_API_KEY. Same value, two names. We accept BOTH rather
 * than renaming in one step — a rename with a typo takes the entire public
 * booking funnel down, and the failure mode is a silent 401 that the website
 * swallows into `{success:false}`. Converge later: add PORTAL_API_KEY in
 * Railway, verify, then drop LEADS_API_KEY.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.PORTAL_API_KEY || process.env.LEADS_API_KEY;
  if (!expected) {
    console.error("[apiKey] PORTAL_API_KEY/LEADS_API_KEY not configured — rejecting request");
    return res.status(503).json({ success: false, message: "Public API not configured" });
  }
  const provided = req.header("x-api-key");
  if (!provided || !timingSafeEqualStr(provided, expected)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

/** Length-checked constant-time compare. `timingSafeEqual` throws on length mismatch. */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
