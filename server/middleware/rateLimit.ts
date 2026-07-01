import rateLimit from "express-rate-limit";
import type { Request } from "express";

// These limiters guard authenticated routes, so key by the resolved user id
// (all offices behind one NAT IP would otherwise share a single bucket).
const perUser = (req: Request) => (req as any).user?.claims?.sub ?? "anonymous";

const shared = {
  keyGenerator: perUser,
  standardHeaders: true as const,
  legacyHeaders: false as const,
};

/**
 * Throttles outbound SMS endpoints to prevent a single account from blasting
 * messages (spam / toll fraud) via /api/sms/test and /api/sms/weekly.
 */
export const smsRateLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15,
  message: { message: "Too many SMS requests. Please try again in a few minutes." },
});

/**
 * Throttles OpenAI-backed endpoints (/api/kpis/generate, /api/setup/chat) to
 * cap per-account model spend. The setup chat is conversational, so the window
 * is generous but bounded.
 */
export const aiRateLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 40,
  message: { message: "Too many AI requests. Please slow down and try again shortly." },
});
