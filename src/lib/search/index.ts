import { db, sqlite } from "@/lib/db";
import { articles, categories } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Full-text search across articles using SQLite FTS5.
 */
export async function searchArticles(
  query: string,
  page = 1,
  limit = 10
): Promise<{
  articles: (typeof articles.$inferSelect & {
    categoryName: string | null;
  })[];
  total: number;
}> {
  const offset = (page - 1) * limit;
  const sanitizedQuery = query.replace(/[^\w\s一-鿿]/g, "").trim();

  if (!sanitizedQuery) {
    return { articles: [], total: 0 };
  }

  // Use FTS5 for full-text search with ranking
  type FtsResult = { id: number; rank: number };
  const ftsResults = sqlite
    .prepare(
      `SELECT rowid as id, rank FROM articles_fts WHERE articles_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
    )
    .all(sanitizedQuery, limit, offset) as FtsResult[];

  const countResult = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM articles_fts WHERE articles_fts MATCH ?`
    )
    .get(sanitizedQuery) as { count: number };

  if (ftsResults.length === 0) {
    return { articles: [], total: 0 };
  }

  const ids = ftsResults.map((r) => r.id);

  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      content: articles.content,
      rawContent: articles.rawContent,
      coverImage: articles.coverImage,
      status: articles.status,
      categoryId: articles.categoryId,
      readingTime: articles.readingTime,
      isFeatured: articles.isFeatured,
      viewCount: articles.viewCount,
      aiMetadata: articles.aiMetadata,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(
      and(
        // Use SQL IN clause for the matching IDs
        sql`${articles.id} IN (${ids.join(",")})`,
        eq(articles.status, "published")
      )
    );

  return {
    articles: results,
    total: countResult.count,
  };
}
