import Link from "next/link";
import { db } from "@/lib/db";
import { articles, categories, tags, articleTags } from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Badge } from "@/components/ui/Badge";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.home") };
}

async function getHomePageData() {
  // Featured articles
  const featured = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      categoryName: categories.name,
      categorySlug: categories.slug,
      readingTime: articles.readingTime,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.status, "published"), eq(articles.isFeatured, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(3);

  // Latest articles
  const latest = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      categoryName: categories.name,
      categorySlug: categories.slug,
      readingTime: articles.readingTime,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(6);

  // Get tags for articles
  const articleIds = latest.map((a) => a.id);
  let tagMap = new Map<number, { id: number; name: string; slug: string }[]>();

  if (articleIds.length > 0) {
    const tagResults = await db
      .select({
        articleId: articleTags.articleId,
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(sql`${articleTags.articleId} IN (${articleIds.join(",")})`);

    for (const t of tagResults) {
      if (!tagMap.has(t.articleId)) tagMap.set(t.articleId, []);
      tagMap.get(t.articleId)!.push({ id: t.id, name: t.name, slug: t.slug });
    }
  }

  // Category cloud
  const categoryCloud = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      color: categories.color,
      count: count(articles.id),
    })
    .from(categories)
    .leftJoin(articles, eq(categories.id, articles.categoryId))
    .groupBy(categories.id)
    .orderBy(desc(count(articles.id)))
    .limit(10);

  // Tag cloud
  const tagCloud = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      count: count(articleTags.articleId),
    })
    .from(tags)
    .leftJoin(articleTags, eq(tags.id, articleTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(count(articleTags.articleId)))
    .limit(20);

  return {
    featured: featured.map((a) => ({ ...a, tags: tagMap.get(a.id) || [] })),
    latest: latest.map((a) => ({ ...a, tags: tagMap.get(a.id) || [] })),
    categoryCloud,
    tagCloud,
  };
}

export default async function HomePage() {
  const { featured, latest, categoryCloud, tagCloud } = await getHomePageData();
  const { t } = await getTranslation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero / Featured */}
      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{t("home.featured")}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((article) => (
              <ArticleCard key={article.id} {...article} />
            ))}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("home.latestArticles")}</h2>
          <Link
            href="/articles"
            className="text-sm text-primary hover:underline"
          >
            {t("home.viewAll")}
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {latest.map((article) => (
            <ArticleCard key={article.id} {...article} />
          ))}
        </div>
      </section>

      {/* Category & Tag Clouds */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Categories */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("home.categories")}</h3>
          <div className="flex flex-wrap gap-2">
            {categoryCloud.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                {cat.color && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
                {cat.name}
                <span className="text-xs text-muted-foreground">
                  ({cat.count})
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("home.tags")}</h3>
          <div className="flex flex-wrap gap-2">
            {tagCloud.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
              >
                <Badge variant="default">
                  {tag.name} ({tag.count})
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
