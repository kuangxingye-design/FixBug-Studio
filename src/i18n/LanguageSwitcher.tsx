"use client";

import { useTranslation } from "./useTranslation";
import type { Locale } from "./config";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  const toggleLocale = () => {
    const next: Locale = locale === "zh-CN" ? "en" : "zh-CN";
    setLocale(next);
  };

  return (
    <button
      onClick={toggleLocale}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-border"
      title={locale === "zh-CN" ? "Switch to English" : "切换到中文"}
    >
      {locale === "zh-CN" ? "EN" : "中"}
    </button>
  );
}
