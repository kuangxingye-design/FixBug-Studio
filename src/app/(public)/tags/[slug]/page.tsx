import { ArticleCard } from "@/components/articles/ArticleCard";
import { Pagination } from "@/components/shared/Pagination";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getTagName(slug: string): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/tags`, { cache: "no-store" });
    const data = await res.json();
    const tag = (data.tags || []).find(
      (t: { slug: string }) => t.slug === slug
    );
    return tag?.name || slug;
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { t } = await getTranslation();
  return { title: t("metadata.tagPage", { name: slug }), description: t("metadata.tagDescription", { name: slug }) };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { page = "1" } = await searchParams;
  const { t } = await getTranslation();

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const apiParams = new URLSearchParams({ page, limit: "12", tag: slug });

  let data = { articles: [], pagination: { page: 1, totalPages: 1, total: 0 } } as {
    articles: Record<string, unknown>[];
    pagination: { page: number; totalPages: number; total: number };
  };

  try {
    const res = await fetch(`${apiUrl}/api/articles?${apiParams}`, { cache: "no-store" });
    data = await res.json();
  } catch {}

  const tagName = await getTagName(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{t("tags.tag", { name: tagName })}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("articles.categoryArticles", { count: data.pagination.total })}</p>

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
              tags={a.tags as { id: number; name: string; slug: string }[] || []}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">{t("articles.noTagArticles")}</div>
      )}

      <div className="mt-8">
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} basePath={`/tags/${slug}`} />
      </div>
    </div>
  );
}
