"use client";

import { createContext, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "./config";
import { COOKIE_NAME, defaultLocale, locales } from "./config";
import zhCN from "./translations/zh-CN.json";
import en from "./translations/en.json";

const dictionaries: Record<Locale, Record<string, unknown>> = {
  "zh-CN": zhCN as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, unknown>;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

interface LanguageProviderProps {
  children: React.ReactNode;
  /** Initial locale detected server-side (avoids flash of wrong language) */
  initialLocale?: Locale;
}

export function LanguageProvider({
  children,
  initialLocale,
}: LanguageProviderProps) {
  const router = useRouter();

  const [locale, setLocaleState] = useState<Locale>(() => {
    // 1. Use server-provided initial value if available
    if (initialLocale && locales.includes(initialLocale)) return initialLocale;
    // 2. Fallback: read cookie on client
    const cookie = readCookie(COOKIE_NAME);
    if (cookie && locales.includes(cookie as Locale)) return cookie as Locale;
    // 3. Final fallback
    return defaultLocale;
  });

  // Sync cookie when locale changes
  useEffect(() => {
    writeCookie(COOKIE_NAME, locale);
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;
      if (!locales.includes(newLocale)) return;
      writeCookie(COOKIE_NAME, newLocale);
      setLocaleState(newLocale);
      // Refresh to update server-rendered content
      router.refresh();
    },
    [locale, router]
  );

  const messages = useMemo(() => dictionaries[locale], [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, messages }),
    [locale, setLocale, messages]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
