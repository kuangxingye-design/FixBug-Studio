import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, articles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const results = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      color: categories.color,
      articleCount: sql<number>`COUNT(${articles.id})`,
    })
    .from(categories)
    .leftJoin(articles, eq(categories.id, articles.categoryId))
    .groupBy(categories.id)
    .orderBy(sql`COUNT(${articles.id}) DESC`);

  return NextResponse.json({ categories: results });
}
