import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// ============================================================
// Markdown → HTML 渲染服务
// ============================================================

/** Default sanitize schema — allows code highlighting classes */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: ["className"],
    span: ["className"],
    pre: ["className"],
  },
};

// Compile the unified pipeline once (expensive to rebuild)
const processor = unified()
  .use(remarkParse) // Parse Markdown
  .use(remarkGfm) // GitHub Flavored Markdown (tables, strikethrough, etc.)
  .use(remarkRehype) // Convert to rehype AST
  .use(rehypeSanitize, sanitizeSchema) // Sanitize HTML
  .use(rehypeHighlight, { detect: true }) // Code syntax highlighting
  .use(rehypeStringify); // Serialize to HTML string

/**
 * Render Markdown string to sanitized HTML.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  if (!markdown) return "";
  const result = await processor.process(markdown);
  return String(result.value);
}

// ============================================================
// TOC generation — extract heading hierarchy from HTML
// ============================================================

export interface TocEntry {
  level: number; // 1-6
  text: string;
  id: string; // slugified anchor
}

/**
 * Extract table of contents from rendered HTML.
 * Finds all <h1>-<h6> tags and builds a hierarchical TOC array.
 */
export function extractToc(html: string): TocEntry[] {
  const headingRegex = /<h([1-6])(?:\s[^>]*?)?\s*id="([^"]*)"[^>]*>(.+?)<\/h\1>/gi;
  const entries: TocEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    entries.push({
      level: parseInt(match[1], 10),
      id: match[2],
      text: stripHtml(match[3]),
    });
  }

  return entries;
}

/**
 * Strip HTML tags from a string, returning plain text.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Generate plain text excerpt from Markdown (first ~200 chars, no markdown syntax).
 */
export function generateExcerpt(markdown: string, maxLength = 200): string {
  // Strip markdown formatting
  let text = markdown
    .replace(/^#{1,6}\s+/gm, "") // Headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/!\[.*?\]\([^)]+\)/g, "") // Images
    .replace(/>\s+/gm, "") // Blockquotes
    .replace(/^[-*+]\s+/gm, "") // List markers
    .replace(/^\d+\.\s+/gm, "") // Numbered list markers
    .replace(/\n{2,}/g, " ") // Collapse multiple newlines
    .replace(/\n/g, " ") // Single newlines → space
    .replace(/\s{2,}/g, " ") // Collapse multiple spaces
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
