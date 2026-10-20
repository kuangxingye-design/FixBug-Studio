import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Pagination } from "@/components/shared/Pagination";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    title: t("metadata.articles"),
    description: t("metadata.articlesDescription"),
  };
}

interface SearchParams {
  page?: string;
  category?: string;
  tag?: string;
  search?: string;
  sort?: string;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = params.page || "1";
  const category = params.category || "";
  const tag = params.tag || "";
  const search = params.search || "";
  const sort = params.sort || "latest";

  const apiParams = new URLSearchParams({ page, limit: "12", sort });
  if (category) apiParams.set("category", category);
  if (search) apiParams.set("search", search);

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let data: {
    articles: Record<string, unknown>[];
    pagination: { page: number; totalPages: number; total: number };
  } = { articles: [], pagination: { page: 1, totalPages: 1, total: 0 } };
  try {
    const res = await fetch(`${apiUrl}/api/articles?${apiParams}`, {
      cache: "no-store",
    });
    data = await res.json();
  } catch {
    // Fallback for build time
  }

  const { t } = await getTranslation();

  const activeFilter = category
    ? t("categories.category", { name: category })
    : search
    ? `${t("search.title")}: "${search}"`
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("articles.title")}</h1>
          {activeFilter && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("articles.filteredBy", { filter: activeFilter })}{" "}
              <Link href="/articles" className="text-primary hover:underline">
                {t("common.clear")}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/articles?sort=latest${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              sort === "latest" || !sort
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("articles.latest")}
          </Link>
          <Link
            href={`/articles?sort=oldest${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              sort === "oldest"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("articles.oldest")}
          </Link>
        </div>
      </div>

      {data.articles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.articles.map((article: Record<string, unknown>) => (
            <ArticleCard
              key={String(article.id)}
              title={String(article.title)}
              slug={String(article.slug)}
              excerpt={article.excerpt as string | null}
              coverImage={article.coverImage as string | null}
              categoryName={(article.categoryName as string) || null}
              categorySlug={(article.categorySlug as string) || null}
              readingTime={(article.readingTime as number) || null}
              viewCount={(article.viewCount as number) || 0}
              publishedAt={(article.publishedAt as string) || null}
              tags={(article.tags as { id: number; name: string; slug: string }[]) || []}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">
            {search
              ? t("articles.noSearchResults", { query: search })
              : t("articles.noArticles")}
          </p>
        </div>
      )}

      <div className="mt-8">
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          basePath="/articles"
          searchParams={
            category ? { category } : search ? { search, sort } : { sort }
          }
        />
      </div>
    </div>
  );
}
