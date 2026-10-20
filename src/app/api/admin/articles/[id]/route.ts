import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { articles, articleTags, articleVersions, tags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { updateArticleSchema } from "@/lib/utils/validators";
import { slugify } from "@/lib/utils/slugify";
import { calculateReadingTime } from "@/lib/utils/reading-time";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Get tags
  const articleTagResults = await db
    .select({ tagId: tags.id, name: tags.name, slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId));

  // Get versions
  const versions = await db
    .select()
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(sql`${articleVersions.version} DESC`);

  return NextResponse.json({
    article: {
      ...article,
      tags: articleTagResults,
      versions,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId));

  if (!existing) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tagIds, ...data } = parsed.data;

    // Save version snapshot if content changed
    if (data.content && data.content !== existing.content) {
      const [latestVersion] = await db
        .select({ v: articleVersions.version })
        .from(articleVersions)
        .where(eq(articleVersions.articleId, articleId))
        .orderBy(sql`${articleVersions.version} DESC`)
        .limit(1);

      const nextVersion = (latestVersion?.v ?? 0) + 1;

      await db.insert(articleVersions).values({
        articleId,
        title: existing.title,
        content: existing.content,
        excerpt: existing.excerpt,
        version: nextVersion,
        changeNote: "Manual edit",
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
      // Update slug if title changes and no explicit slug
      if (!data.slug) {
        updateData.slug = slugify(data.title);
      }
    }
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined) {
      updateData.content = data.content;
      updateData.readingTime = calculateReadingTime(data.content);
    }
    if (data.rawContent !== undefined) updateData.rawContent = data.rawContent;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "published" && !existing.publishedAt) {
        updateData.publishedAt = new Date().toISOString();
      }
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.aiMetadata !== undefined) updateData.aiMetadata = data.aiMetadata;
    updateData.updatedAt = new Date().toISOString();

    await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, articleId));

    // Update tag associations
    if (tagIds !== undefined) {
      await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
      if (tagIds.length > 0) {
        await db.insert(articleTags).values(
          tagIds.map((tagId) => ({ articleId, tagId }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update article error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  await db.delete(articles).where(eq(articles.id, articleId));

  return NextResponse.json({ success: true });
}
