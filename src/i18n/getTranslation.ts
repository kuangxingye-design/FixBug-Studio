import { getLocaleFromCookie } from "./cookie";
import type { Locale } from "./config";
import zhCN from "./translations/zh-CN.json";
import en from "./translations/en.json";

const dictionaries: Record<Locale, Record<string, unknown>> = {
  "zh-CN": zhCN as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

/**
 * Server-side translation helper.
 * Use in RSC pages/layouts that can't use the client hook.
 *
 * @example
 *   const { t, locale } = await getTranslation();
 *   return <h1>{t("home.featured")}</h1>;
 */
export async function getTranslation() {
  const locale = await getLocaleFromCookie();
  const messages = dictionaries[locale];

  function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: unknown = messages;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
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

  return { t, locale };
}

export type ServerTFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;
