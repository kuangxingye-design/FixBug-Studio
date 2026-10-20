import { db } from "@/lib/db";
import { articles, categories, tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const publishedArticles = await db
    .select({ slug: articles.slug, updatedAt: articles.updatedAt })
    .from(articles)
    .where(eq(articles.status, "published"));

  const allCategories = await db
    .select({ slug: categories.slug })
    .from(categories);

  const allTags = await db
    .select({ slug: tags.slug })
    .from(tags);

  const urls: string[] = [
    baseUrl,
    `${baseUrl}/articles`,
    `${baseUrl}/categories`,
    `${baseUrl}/tags`,
    `${baseUrl}/archive`,
    `${baseUrl}/about`,
  ];

  for (const a of publishedArticles) {
    urls.push(`${baseUrl}/articles/${a.slug}`);
  }
  for (const c of allCategories) {
    urls.push(`${baseUrl}/categories/${c.slug}`);
  }
  for (const t of allTags) {
    urls.push(`${baseUrl}/tags/${t.slug}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXML(url)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url === baseUrl ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
