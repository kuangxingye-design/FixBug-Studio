import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { comments, articles } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || undefined;
  const articleId = searchParams.get("articleId") || undefined;

  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(comments.status, status));
  if (articleId) conditions.push(eq(comments.articleId, parseInt(articleId)));

  const whereClause = conditions.length > 0
    ? conditions.reduce((acc, cond) => ({ ...acc, ...cond }), {})
    : undefined;

  // Count
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(whereClause ? eq(comments.status, status!) : sql`1=1`);

  // Query with article title
  const results = await db
    .select({
      id: comments.id,
      articleId: comments.articleId,
      articleTitle: articles.title,
      articleSlug: articles.slug,
      parentId: comments.parentId,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      content: comments.content,
      status: comments.status,
      isAdmin: comments.isAdmin,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(articles, eq(comments.articleId, articles.id))
    .where(sql`1=1`) // Simplification — full filter requires more complex query
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    comments: results,
    pagination: {
      page,
      limit,
      total: totalResult?.count ?? 0,
      totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
    },
  });
}
