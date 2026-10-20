import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, articles } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { createCommentSchema } from "@/lib/utils/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Find article
  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, slug));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Get approved comments
  const results = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.articleId, article.id),
        eq(comments.status, "approved")
      )
    )
    .orderBy(desc(comments.createdAt));

  // Build nested structure
  const topLevel = results.filter((c) => !c.parentId);
  const replies = results.filter((c) => c.parentId);

  const nested = topLevel.map((comment) => ({
    ...comment,
    replies: replies
      .filter((r) => r.parentId === comment.id)
      .map((r) => ({
        ...r,
        replies: replies.filter((r2) => r2.parentId === r.id),
      })),
  }));

  return NextResponse.json({ comments: nested });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, slug));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check comment settings
    const { status } = await import("@/lib/db/schema").then(({ siteSettings }) =>
      db
        .select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, "auto_approve_comments"))
        .then(([r]) => ({ status: r?.value === "true" ? "approved" : "pending" }))
    ).catch(() => ({ status: "pending" as const }));

    const [comment] = await db
      .insert(comments)
      .values({
        articleId: article.id,
        parentId: parsed.data.parentId || null,
        authorName: parsed.data.authorName || "Anonymous",
        authorEmail: parsed.data.authorEmail || null,
        content: parsed.data.content,
        status: "pending", // Always pending for review
        isAdmin: false,
      })
      .returning();

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
