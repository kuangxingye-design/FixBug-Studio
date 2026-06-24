import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { ToolPermission } from "../tools/types.js";

// ============================================================
// Auth Middleware — injects req.user and provides role guards
// ============================================================

/**
 * User context injected into the request by the auth middleware.
 */
export interface RequestUser {
  id: number;
  email: string;
  role: ToolPermission;
  nickname: string;
}

/**
 * Parse session + load user → inject req.user.
 * Runs on every request. Required for both guests (no user) and logged-in users.
 */
export async function authMiddleware(
  req: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const session = (req as any).getSession?.();
  if (!session || !session.userId) {
    return; // Guest — no user injected
  }

  // Load user from DB
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      nickname: users.nickname,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return;

  // Check if user is disabled
  if (user.status === "disabled") {
    // Treat disabled users as guests
    return;
  }

  (req as any).user = {
    id: user.id,
    email: user.email,
    role: user.role as ToolPermission,
    nickname: user.nickname,
  } satisfies RequestUser;
}

/**
 * Factory: returns a preHandler that requires a minimum role.
 *
 * Usage:
 *   fastify.get("/admin/dashboard", {
 *     preHandler: requireRole("admin")
 *   }, handler)
 */
export function requireRole(
  minimumRole: ToolPermission
): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const roleHierarchy: Record<ToolPermission, number> = {
    guest: 0,
    user: 1,
    admin: 2,
  };

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as RequestUser | undefined;
    const userLevel = user ? roleHierarchy[user.role] : roleHierarchy.guest;
    const requiredLevel = roleHierarchy[minimumRole];

    if (userLevel < requiredLevel) {
      // If user is not logged in at all → 401
      // If logged in but insufficient role → 403
      const status = !user ? 401 : 403;
      await reply.status(status).send({
        success: false,
        error:
          minimumRole === "user"
            ? "请先登录后再操作"
            : "权限不足，需要管理员权限",
        code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      });
    }
  };
}

// Extend Fastify types
declare module "fastify" {
  interface FastifyRequest {
    user?: RequestUser;
  }
}
