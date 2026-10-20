import { cookies } from "next/headers";
import { COOKIE_NAME, defaultLocale, type Locale, locales } from "./config";

/**
 * Read locale from NEXT_LOCALE cookie (server-side, async).
 * Returns the stored locale, or the default if missing/invalid.
 */
export async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const store = await cookies();
    const cookie = store.get(COOKIE_NAME);
    if (cookie && locales.includes(cookie.value as Locale)) {
      return cookie.value as Locale;
    }
  } catch {
    // cookies() may throw outside of request context
  }
  return defaultLocale;
}
