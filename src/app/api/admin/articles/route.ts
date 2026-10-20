import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { articles, articleTags, categories, tags } from "@/lib/db/schema";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { createArticleSchema } from "@/lib/utils/validators";
import { slugify } from "@/lib/utils/slugify";
import { calculateReadingTime } from "@/lib/utils/reading-time";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const search = searchParams.get("search") || undefined;

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [];
  if (status) {
    conditions.push(eq(articles.status, status));
  }
  if (category) {
    conditions.push(eq(categories.slug, category));
  }
  if (search) {
    conditions.push(
      or(
        like(articles.title, `%${search}%`),
        like(articles.content, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`count(DISTINCT ${articles.id})` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(whereClause);

  const [totalResult] = await countQuery;
  const total = totalResult?.count ?? 0;

  // Get articles with category
  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      status: articles.status,
      categoryId: articles.categoryId,
      categoryName: categories.name,
      readingTime: articles.readingTime,
      isFeatured: articles.isFeatured,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(whereClause)
    .orderBy(desc(articles.updatedAt))
    .limit(limit)
    .offset(offset);

  // Get tags for each article
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
          .where(
            // We need an IN clause here — use raw sql
            sql`${articleTags.articleId} IN (${articleIds.join(",")})`
          )
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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tagIds, ...data } = parsed.data;

    // Generate slug if not provided
    const slug = data.slug || slugify(data.title);
    const readingTime = calculateReadingTime(data.content);

    // Handle publishedAt
    let publishedAt = null;
    if (data.status === "published") {
      publishedAt = new Date().toISOString();
    }

    const [article] = await db
      .insert(articles)
      .values({
        title: data.title,
        slug,
        excerpt: data.excerpt || null,
        content: data.content,
        rawContent: data.rawContent || null,
        coverImage: data.coverImage || null,
        status: data.status || "draft",
        categoryId: data.categoryId || null,
        readingTime,
        isFeatured: data.isFeatured || false,
        aiMetadata: data.aiMetadata || null,
        publishedAt,
      })
      .returning();

    // Create tag associations
    if (tagIds && tagIds.length > 0) {
      await db.insert(articleTags).values(
        tagIds.map((tagId) => ({ articleId: article.id, tagId }))
      );
    }

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
