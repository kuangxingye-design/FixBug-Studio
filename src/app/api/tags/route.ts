import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags, articleTags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      articleCount: sql<number>`COUNT(${articleTags.articleId})`,
    })
    .from(tags)
    .leftJoin(articleTags, eq(tags.id, articleTags.tagId))
    .groupBy(tags.id)
    .orderBy(sql`COUNT(${articleTags.articleId}) DESC`);

  return NextResponse.json({ tags: results });
}
