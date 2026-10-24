import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "blog_session";
const LOCALE_COOKIE = "NEXT_LOCALE";
const DEFAULT_LOCALE = "zh-CN";
const SUPPORTED_LOCALES = ["zh-CN", "en"];

/**
 * Protected route patterns.
 * Matches all /admin/* routes except /admin/login
 */
const PROTECTED_PATTERNS = [/^\/admin\/(?!login)/];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

function getLoginUrl(request: NextRequest, pathname: string): URL {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
  const loginUrl = new URL("/admin/login", `${protocol}://${host}`);
  loginUrl.searchParams.set("redirect", pathname);
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|xml|txt)$/)
  ) {
    return NextResponse.next();
  }

  // --- Locale detection: set NEXT_LOCALE cookie if missing ---
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!localeCookie || !SUPPORTED_LOCALES.includes(localeCookie)) {
    // Detect preferred locale from Accept-Language header
    const acceptLang = request.headers.get("Accept-Language") || "";
    const preferred = acceptLang.startsWith("en") ? "en" : DEFAULT_LOCALE;

    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, preferred, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
    return response;
  }

  // Only check admin routes
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(getLoginUrl(request, pathname));
  }

  // Verify JWT token
  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(getLoginUrl(request, pathname));
  }
}

export const config = {
  matcher: "/admin/:path*",
};
