import { db } from "@/lib/db";
import { articles, siteSettings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { extractPlainText } from "@/lib/markdown/render";

/**
 * Generate RSS 2.0 XML feed from published articles.
 */
export async function generateRSSFeed(baseUrl: string): Promise<string> {
  const [siteName] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "site_name"));

  const [siteDesc] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "site_description"));

  const name = siteName?.value || "My Blog";
  const description = siteDesc?.value || "A personal blog";

  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(20);

  const items = publishedArticles
    .map(
      (a) => `
    <item>
      <title>${escapeXML(a.title)}</title>
      <link>${baseUrl}/articles/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/articles/${a.slug}</guid>
      <description>${escapeXML(a.excerpt || extractPlainText(a.content).substring(0, 300))}</description>
      <pubDate>${formatRSSDate(a.publishedAt || a.createdAt)}</pubDate>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXML(name)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXML(description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${formatRSSDate(new Date().toISOString())}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

function formatRSSDate(date: string): string {
  return new Date(date).toUTCString();
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
