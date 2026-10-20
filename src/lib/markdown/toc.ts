/**
 * Table of Contents extraction from markdown content.
 */

export interface TOCItem {
  id: string;
  text: string;
  level: number;
  children: TOCItem[];
}

/**
 * Generate a slug from heading text for anchor links.
 */
function headingToSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extract table of contents from markdown content.
 */
export function extractTOC(markdown: string): TOCItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TOCItem[] = [];
  const stack: TOCItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = headingToSlug(text);

    const item: TOCItem = {
      id,
      text,
      level,
      children: [],
    };

    // Pop stack until we find a parent (lower level number)
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      items.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  }

  return items;
}
