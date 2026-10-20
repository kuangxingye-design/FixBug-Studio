import { format, formatDistanceToNow, parseISO } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import type { Locale } from "@/i18n/config";

const dateLocales: Record<string, typeof zhCN> = {
  "zh-CN": zhCN,
  en: enUS,
};

function getDateFnsLocale(locale: string): typeof zhCN {
  return dateLocales[locale] || zhCN;
}

/**
 * Format a date string for display in articles.
 * e.g., "2026年7月9日" (zh-CN) or "July 9, 2026" (en)
 */
export function formatDate(date: string | Date, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const localeObj = getDateFnsLocale(locale);
  return format(d, "PPP", { locale: localeObj });
}

/**
 * Format a date with short month format.
 * e.g., "2026年7月9日" (zh-CN) or "Jul 9, 2026" (en)
 */
export function formatDateShort(date: string | Date, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const localeObj = getDateFnsLocale(locale);
  return format(d, "PP", { locale: localeObj });
}

/**
 * Format relative time.
 * e.g., "3天前" (zh-CN) or "3 days ago" (en)
 */
export function formatRelativeTime(date: string | Date, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const localeObj = getDateFnsLocale(locale);
  return formatDistanceToNow(d, { addSuffix: true, locale: localeObj });
}

/**
 * Get year-month key for archive grouping.
 * e.g., "2026-07"
 */
export function getYearMonthKey(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM");
}

/**
 * Format year-month key for display.
 * e.g., "2026年7月" (zh-CN) or "July 2026" (en)
 */
export function formatYearMonth(key: string, locale: string = "zh-CN"): string {
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const localeObj = getDateFnsLocale(locale);
  return format(date, "yyyy MMMM", { locale: localeObj });
}
