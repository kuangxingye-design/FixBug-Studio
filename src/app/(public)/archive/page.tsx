import Link from "next/link";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getYearMonthKey, formatYearMonth, formatDateShort } from "@/lib/utils/date";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.archive") };
}

async function getArchiveData() {
  const publishedArticles = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));

  // Group by year-month
  const grouped = new Map<string, { title: string; slug: string; date: string }[]>();
  for (const a of publishedArticles) {
    const date = a.publishedAt || a.createdAt;
    const key = getYearMonthKey(date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ title: a.title, slug: a.slug, date });
  }

  return Array.from(grouped.entries()).map(([key, articles]) => ({
    key,
    label: formatYearMonth(key),
    articles,
  }));
}

export default async function ArchivePage() {
  const archive = await getArchiveData();
  const { t, locale } = await getTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{t("archive.title")}</h1>

      {archive.length > 0 ? (
        <div className="space-y-8">
          {archive.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-lg font-semibold text-muted-foreground">
                {formatYearMonth(group.key, locale)}
              </h2>
              <ul className="space-y-2">
                {group.articles.map((a) => (
                  <li key={a.slug} className="flex items-center justify-between">
                    <Link
                      href={`/articles/${a.slug}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {a.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDateShort(a.date, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          {t("archive.noArticles")}
        </div>
      )}
    </div>
  );
}
