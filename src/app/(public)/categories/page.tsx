import Link from "next/link";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.categories") };
}

async function getCategories() {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/categories`, { cache: "no-store" });
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  const { t } = await getTranslation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("categories.title")}</h1>
      {categories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat: Record<string, unknown>) => (
            <Link
              key={String(cat.id)}
              href={`/categories/${cat.slug}`}
              className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                {cat.color ? (
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: String(cat.color) }} />
                ) : null}
                <h3 className="font-semibold">{String(cat.name)}</h3>
              </div>
              {cat.description ? (
                <p className="text-sm text-muted-foreground">{String(cat.description)}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">{t("categories.articlesCount", { count: Number(cat.articleCount || 0) })}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">{t("categories.noCategories")}</p>
      )}
    </div>
  );
}
