import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, categories } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const results = await db
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
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.isFeatured, true)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(3);

  return NextResponse.json({ articles: results });
}
