import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, categories, articleTags, tags } from "@/lib/db/schema";
import { eq, desc, and, like, or, sql, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "latest";

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions: (SQL<unknown> | undefined)[] = [eq(articles.status, "published")];
  if (category) {
    conditions.push(eq(categories.slug, category));
  }
  if (search) {
    conditions.push(
      or(
        like(articles.title, `%${search}%`),
        like(articles.excerpt, `%${search}%`)
      )
    );
  }
  if (tag) {
    conditions.push(
      sql`${articles.id} IN (SELECT ${articleTags.articleId} FROM ${articleTags} INNER JOIN ${tags} ON ${articleTags.tagId} = ${tags.id} WHERE ${tags.slug} = ${tag})`
    );
  }

  // Filter out undefined and cast
  const validConditions = conditions.filter((c): c is SQL<unknown> => !!c);
  const whereClause = and(...validConditions);

  // Count
  const countQuery = db
    .select({ count: sql<number>`count(DISTINCT ${articles.id})` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(whereClause);

  const [totalResult] = await countQuery;
  const total = totalResult?.count ?? 0;

  // Sort
  const orderBy = sort === "oldest" ? articles.publishedAt : desc(articles.publishedAt);

  // Query
  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
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
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Get tags
  const articleIds = results.map((a) => a.id);
  const articleTagResults =
    articleIds.length > 0
      ? await db
          .select({
            articleId: articleTags.articleId,
            tagId: tags.id,
            tagName: tags.name,
            tagSlug: tags.slug,
          })
          .from(articleTags)
          .innerJoin(tags, eq(articleTags.tagId, tags.id))
          .where(sql`${articleTags.articleId} IN (${articleIds.join(",")})`)
      : [];

  const tagMap = new Map<number, { id: number; name: string; slug: string }[]>();
  for (const at of articleTagResults) {
    if (!tagMap.has(at.articleId)) tagMap.set(at.articleId, []);
    tagMap.get(at.articleId)!.push({ id: at.tagId, name: at.tagName, slug: at.tagSlug });
  }

  const articlesWithTags = results.map((a) => ({
    ...a,
    tags: tagMap.get(a.id) || [],
  }));

  return NextResponse.json({
    articles: articlesWithTags,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
