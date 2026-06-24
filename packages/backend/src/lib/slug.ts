import { nanoid } from "nanoid";
import { db } from "../db/connection.js";
import { articles } from "../db/schema.js";
import { sql, eq, and, ne } from "drizzle-orm";

// ============================================================
// Slug 生成工具 — 中文友好 + 重名自动去重
// ============================================================

/**
 * Characters that are valid in a URL slug.
 * Keep ASCII alphanumeric, hyphens, and CJK characters (modern browsers support them).
 */
const VALID_SLUG_CHAR = /[^a-z0-9一-鿿぀-ゟ゠-ヿ\-]/g;
const HYPHEN_COLLAPSE = /-{2,}/g;
const TRIM_HYPHEN = /^-+|-+$/g;

/**
 * Generate a slug from a title string.
 *
 * Strategy:
 * 1. Lowercase + trim
 * 2. Replace spaces with hyphens
 * 3. Remove invalid characters
 * 4. If the result is empty (all-symbol title), use a short nanoid
 * 5. Check DB for duplicates; if conflict, append a suffix
 */
export async function generateSlug(title: string): Promise<string> {
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(VALID_SLUG_CHAR, "")
    .replace(HYPHEN_COLLAPSE, "-")
    .replace(TRIM_HYPHEN, "");

  // If after sanitization there's nothing meaningful, use a date-nanoid slug
  if (!slug || slug.length < 2) {
    slug = `post-${nanoid(8)}`;
  }

  // Truncate long slugs
  if (slug.length > 120) {
    slug = slug.slice(0, 120).replace(TRIM_HYPHEN, "");
  }

  // Check for duplicates and append suffix if needed
  const base = slug;
  let suffix = 1;
  while (await slugExists(slug)) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}

/**
 * Check if a slug already exists in the database.
 * Optionally exclude an article ID (for updates where slug stays the same).
 */
export async function slugExists(
  slug: string,
  excludeArticleId?: number
): Promise<boolean> {
  const conditions = [eq(articles.slug, slug)];
  if (excludeArticleId !== undefined) {
    conditions.push(ne(articles.id, excludeArticleId));
  }

  const [row] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(...conditions))
    .limit(1);

  return !!row;
}

/**
 * Regenerate slug for an article (used on title update).
 * If the new title produces the same base slug, keep the original.
 */
export async function regenerateSlug(
  newTitle: string,
  currentSlug: string,
  articleId: number
): Promise<string> {
  const newSlug = await generateSlug(newTitle);

  // If the generated slug is the same as current, no change needed
  if (newSlug === currentSlug) return currentSlug;

  // If the new slug doesn't exist (excluding this article), use it
  if (!(await slugExists(newSlug, articleId))) {
    return newSlug;
  }

  // Otherwise append suffix
  let suffix = 1;
  let candidate = `${newSlug}-${suffix}`;
  while (await slugExists(candidate, articleId)) {
    suffix++;
    candidate = `${newSlug}-${suffix}`;
  }

  return candidate;
}
