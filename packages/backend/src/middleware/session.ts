import type { FastifyRequest, FastifyReply } from "fastify";
import { nanoid } from "nanoid";
import { db } from "../db/connection.js";
import { chatSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ============================================================
// Session Manager — Cookie-based session for guests & users
// ============================================================

const SESSION_COOKIE = "fixbug_sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  id: number; // DB row id
  sessionToken: string;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

/**
 * In-memory session cache to avoid hitting DB on every request.
 * Maps sessionToken → SessionData.
 */
const sessionCache = new Map<string, SessionData>();

/**
 * Generate a new session token. Creates a DB record for persistence.
 */
export async function createSession(
  userId: number | null = null
): Promise<SessionData> {
  const sessionToken = nanoid(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const [row] = await db
    .insert(chatSessions)
    .values({
      userId,
      sessionToken,
      messages: "[]",
      context: "{}",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    })
    .returning();

  const session: SessionData = {
    id: row.id,
    sessionToken,
    userId: row.userId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };

  sessionCache.set(sessionToken, session);
  return session;
}

/**
 * Look up a session by token. Checks cache first, then DB.
 * Returns null if not found or expired.
 */
export async function getSession(
  token: string
): Promise<SessionData | null> {
  // Check cache
  const cached = sessionCache.get(token);
  if (cached) {
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      sessionCache.delete(token);
      return null;
    }
    return cached;
  }

  // Query DB
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.sessionToken, token))
    .limit(1);

  if (!row) return null;

  // Check expiry
  if (row.expiresAt && row.expiresAt < new Date()) {
    return null;
  }

  const session: SessionData = {
    id: row.id,
    sessionToken: row.sessionToken,
    userId: row.userId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };

  sessionCache.set(token, session);
  return session;
}

/**
 * Destroy a session (logout).
 */
export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token);
  await db
    .delete(chatSessions)
    .where(eq(chatSessions.sessionToken, token));
}

/**
 * Fastify plugin: parses the session cookie and attaches session info to the request.
 * Adds `req.sessionId` and `req.getSession()` helper.
 */
export async function sessionPlugin(
  app: import("fastify").FastifyInstance
): Promise<void> {
  app.decorateRequest("sessionId", "");
  app.decorateRequest("getSession", () => null);

  app.addHook("onRequest", async (req: FastifyRequest) => {
    // Read session cookie
    const rawCookie = req.cookies?.[SESSION_COOKIE];
    const token =
      typeof rawCookie === "string"
        ? rawCookie
        : Array.isArray(rawCookie)
          ? rawCookie[0]
          : undefined;

    if (token) {
      const session = await getSession(token);
      if (session) {
        (req as any).sessionId = token;
        (req as any).getSession = () => session;
      }
    }
  });
}

/**
 * Set the session cookie on a reply.
 */
export function setSessionCookie(
  reply: FastifyReply,
  token: string
): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/**
 * Clear the session cookie (logout).
 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: "/",
  });
}

// Extend Fastify types
declare module "fastify" {
  interface FastifyRequest {
    sessionId?: string;
    getSession?: () => SessionData | null;
  }
}
