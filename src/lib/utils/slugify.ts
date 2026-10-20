/**
 * Convert a string to a URL-friendly slug.
 * Preserves CJK characters, letters, numbers, and dashes.
 */
export function slugify(text: string): string {
  let slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    // Remove chars that are NOT: word chars, CJK unified ideographs, dashes
    .replace(/[^\w一-鿿㐀-䶿豈-﫿\-]+/g, "")
    .replace(/--+/g, "-") // Collapse multiple dashes
    .replace(/^-+/, "") // Trim dashes from start
    .replace(/-+$/, ""); // Trim dashes from end

  // Fallback: if slug is empty after processing (e.g. emoji-only or special chars),
  // use "post" as a safe default
  if (!slug) {
    slug = "post";
  }

  return slug;
}

/**
 * Generate a unique slug by appending a suffix if necessary.
 */
export async function uniqueSlug(
  baseSlug: string,
  existsCheck: (slug: string) => Promise<boolean>,
  maxAttempts = 50
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while ((await existsCheck(slug)) && counter < maxAttempts) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
