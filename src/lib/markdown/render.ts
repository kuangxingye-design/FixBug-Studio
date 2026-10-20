/**
 * Markdown rendering utilities.
 *
 * React Server Components use `react-markdown` directly in JSX.
 * This file provides server-side preprocessing utilities.
 */

/**
 * Extract plain text from markdown content (for search indexing, excerpts, etc.)
 */
export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "") // Remove headings
    .replace(/[*_~`>]/g, "") // Remove inline formatting chars
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Replace links with text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // Replace images with alt text
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/`([^`]*)`/g, "$1") // Remove inline code
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}

/**
 * Strip all markdown formatting to get pure plain text.
 */
export function stripMarkdown(markdown: string): string {
  return extractPlainText(markdown);
}
