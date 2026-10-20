import { ArticleCard } from "@/components/articles/ArticleCard";
import { Pagination } from "@/components/shared/Pagination";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.search") };
}

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const { t } = await getTranslation();

  let data = { articles: [], pagination: { page: 1, totalPages: 0, total: 0 } } as {
    articles: Record<string, unknown>[];
    pagination: { page: number; totalPages: number; total: number };
  };

  if (q.trim()) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const params = new URLSearchParams({ q, page, limit: "10" });
      const res = await fetch(`${apiUrl}/api/search?${params}`, { cache: "no-store" });
      data = await res.json();
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("search.title")}</h1>

      <form className="mb-8" action="/search" method="GET">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search.placeholder")}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t("search.button")}
          </button>
        </div>
      </form>

      {q.trim() ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("search.results", { count: data.pagination.total, query: q })}
          </p>
          {data.articles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.articles.map((a) => (
                <ArticleCard
                  key={String(a.id)}
                  title={String(a.title)}
                  slug={String(a.slug)}
                  excerpt={a.excerpt as string | null}
                  coverImage={a.coverImage as string | null}
                  categoryName={a.categoryName as string | null}
                  categorySlug={a.categorySlug as string | null}
                  readingTime={a.readingTime as number | null}
                  viewCount={(a.viewCount as number) || 0}
                  publishedAt={a.publishedAt as string | null}
                  tags={[]}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              {t("search.noResults")}
            </div>
          )}
          <div className="mt-8">
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} basePath="/search" searchParams={{ q }} />
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          {t("search.enterSearchTerm")}
        </div>
      )}
    </div>
  );
}
