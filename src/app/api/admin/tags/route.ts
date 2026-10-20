import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tags, articleTags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createTagSchema } from "@/lib/utils/validators";
import { slugify } from "@/lib/utils/slugify";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      createdAt: tags.createdAt,
      articleCount: sql<number>`COUNT(${articleTags.articleId})`,
    })
    .from(tags)
    .leftJoin(articleTags, eq(tags.id, articleTags.tagId))
    .groupBy(tags.id)
    .orderBy(sql`articleCount DESC`);

  return NextResponse.json({ tags: results });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);

    // Check for duplicates
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug));

    if (existing) {
      return NextResponse.json({ tag: existing });
    }

    const [tag] = await db
      .insert(tags)
      .values({ name: parsed.data.name, slug })
      .returning();

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
