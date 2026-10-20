"use client";

import { useContext } from "react";
import { LanguageContext } from "./LanguageProvider";
import type { Locale } from "./config";

/**
 * Custom hook to access translations in client components.
 * Returns `t` function, current `locale`, and `setLocale` to switch language.
 */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }

  const { locale, setLocale, messages } = ctx;

  /**
   * Translate a dot-notation key (e.g. "common.search") to the current locale.
   * Supports template params: t("search.results", { count: 5, query: "hello" })
   */
  function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: unknown = messages;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback: return the key itself
        return key;
      }
    }
    if (typeof value !== "string") {
      return key;
    }
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, name: string) =>
        String(params[name] ?? `{${name}}`)
      );
    }
    return value;
  }

  return { t, locale, setLocale } as const;
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;
