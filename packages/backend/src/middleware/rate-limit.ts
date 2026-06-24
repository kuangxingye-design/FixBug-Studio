import type { FastifyRequest, FastifyReply } from "fastify";
import type { ToolRateLimit } from "../tools/types.js";

// ============================================================
// Rate Limiter — in-memory sliding window per identifier
// ============================================================

interface RateLimitEntry {
  count: number;
  windowStart: number; // epoch ms
}

/**
 * In-memory rate limit store.
 * Key = `${toolName}:${identifier}` where identifier is userId or IP.
 */
const store = new Map<string, RateLimitEntry>();

/**
 * Periodic cleanup to prevent memory leaks.
 * Runs every 5 minutes, removes expired entries.
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 60 * 60 * 1000) {
      // Keep entries for at most 1 hour after window start
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL).unref(); // don't keep process alive

/**
 * Create a rate limit preHandler for a specific tool.
 *
 * Returns a Fastify preHandler that enforces the tool's rate limit.
 */
export function createRateLimiter(
  toolName: string,
  config: ToolRateLimit
): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const windowMs = config.windowSeconds * 1000;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Determine identifier: userId > sessionId > IP
    const user = (req as any).user;
    const sessionId = (req as any).sessionId as string | undefined;
    const identifier =
      user?.id?.toString() ?? sessionId ?? req.ip ?? "unknown";

    const key = `${toolName}:${identifier}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      entry = { count: 0, windowStart: now };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > config.max) {
      const retryAfter = Math.ceil(
        (entry.windowStart + windowMs - now) / 1000
      );
      await reply.status(429).send({
        success: false,
        error: `请求过于频繁，请 ${retryAfter} 秒后再试`,
        code: "RATE_LIMITED",
        retryAfter,
      });
    }
  };
}

/**
 * Convenience rate limiter for auth endpoints (login/register).
 * 5 attempts per minute per IP.
 */
export const authRateLimiter = createRateLimiter("auth", {
  max: 5,
  windowSeconds: 60,
});
