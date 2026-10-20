import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { categories, articles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createCategorySchema } from "@/lib/utils/validators";
import { slugify } from "@/lib/utils/slugify";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      color: categories.color,
      sortOrder: categories.sortOrder,
      createdAt: categories.createdAt,
      articleCount: sql<number>`COUNT(${articles.id})`,
    })
    .from(categories)
    .leftJoin(articles, eq(categories.id, articles.categoryId))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder);

  return NextResponse.json({ categories: results });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);

    const [category] = await db
      .insert(categories)
      .values({ ...parsed.data, slug })
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
