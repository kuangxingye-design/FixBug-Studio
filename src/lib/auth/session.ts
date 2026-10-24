import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const SESSION_COOKIE = "blog_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

/**
 * Create a JWT-based session token for a user.
 * Embeds the DB session ID so it can be looked up later.
 */
async function createToken(userId: number, sessionId: string): Promise<string> {
  return new SignJWT({ sub: String(userId), sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

/**
 * Verify and decode a session token.
 * Returns userId and sessionId for DB verification.
 */
export async function verifyToken(
  token: string
): Promise<{ userId: number; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: Number(payload.sub), sessionId: payload.sid as string };
  } catch {
    return null;
  }
}

/**
 * Create a new session for a user.
 * Stores session in DB and sets httpOnly cookie.
 */
export async function createSession(userId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const token = await createToken(userId, sessionId);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  // Set cookie. Only use Secure when the actual request is HTTPS.
  // Deriving from NEXT_PUBLIC_APP_URL breaks local development when the
  // production app URL is https:// but the local server runs on http://.
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const isSecure = !isLocalhost && (
    forwardedProto === "https" ||
    (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://")
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

/**
 * Delete the current session (logout).
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const decoded = await verifyToken(token);
    if (decoded) {
      await db.delete(sessions).where(eq(sessions.id, decoded.sessionId));
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get the current user from the session cookie.
 * Returns null if not logged in or session expired.
 */
export async function getCurrentUser(): Promise<
  (typeof users.$inferSelect) | null
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const decoded = await verifyToken(token);
  if (!decoded) return null;

  // Verify session exists in DB
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, decoded.sessionId),
        gt(sessions.expiresAt, Math.floor(Date.now() / 1000))
      )
    );

  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, decoded.userId));

  return user ?? null;
}

/**
 * Check if any admin user exists (for first-run setup).
 */
export async function hasAdminUser(): Promise<boolean> {
  const result = await db.select().from(users).limit(1);
  return result.length > 0;
}

/**
 * Middleware helper: require the user to be logged in.
 * Throws if not authenticated.
 */
export async function requireAuth(): Promise<typeof users.$inferSelect> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
