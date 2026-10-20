import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, categories, articleTags, tags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      content: articles.content,
      coverImage: articles.coverImage,
      status: articles.status,
      categoryId: articles.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      readingTime: articles.readingTime,
      isFeatured: articles.isFeatured,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.slug, slug));

  if (!article || article.status !== "published") {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Increment view count
  await db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.id, article.id));

  // Get tags
  const articleTagResults = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, article.id));

  // Get adjacent articles
  const [prevArticle] = await db
    .select({ title: articles.title, slug: articles.slug })
    .from(articles)
    .where(
      sql`${articles.status} = 'published' AND ${articles.publishedAt} < ${article.publishedAt}`
    )
    .orderBy(sql`${articles.publishedAt} DESC`)
    .limit(1);

  const [nextArticle] = await db
    .select({ title: articles.title, slug: articles.slug })
    .from(articles)
    .where(
      sql`${articles.status} = 'published' AND ${articles.publishedAt} > ${article.publishedAt}`
    )
    .orderBy(articles.publishedAt)
    .limit(1);

  return NextResponse.json({
    article: {
      ...article,
      tags: articleTagResults,
      prevArticle: prevArticle || null,
      nextArticle: nextArticle || null,
    },
  });
}
