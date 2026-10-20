/**
 * Image reference utilities for markdown.
 *
 * An uploaded .md usually references its images by relative path (e.g. `./images/a.png`).
 * Those files sit next to the .md on the author's disk — the browser never uploads them
 * with the document. So they are uploaded separately to the media library and the
 * references are rewritten to the served URL before the content reaches the AI.
 */

/** Extensions treated as images when they arrive with a missing/incorrect MIME type. */
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".bmp",
  ".ico",
]);

/** Matches `![alt](src)` and `![alt](src "title")`. */
const IMAGE_REF_PATTERN = /!\[([^\]]*)\]\(\s*([^)\s]+)(\s+"[^"]*")?\s*\)/g;

/** Opening or closing fence of a fenced code block. */
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;

/** An inline code span, kept as a capture group so `split` preserves the delimiter. */
const INLINE_CODE_PATTERN = /(`+[^`\n]*`+)/;

/**
 * Apply `fn` to the prose of a document, leaving code untouched.
 *
 * Rewriting image syntax inside code would corrupt documents that *show* markdown —
 * a tutorial containing `![alt](images/a.png)` in a fenced block is an example, not a
 * reference to a real file.
 */
function transformOutsideCode(
  markdown: string,
  fn: (text: string) => string
): string {
  let fence: string | null = null;

  return markdown
    .split("\n")
    .map((line) => {
      const fenceMatch = line.match(FENCE_PATTERN);

      if (fence) {
        const closes =
          fenceMatch !== null &&
          fenceMatch[1][0] === fence[0] &&
          fenceMatch[1].length >= fence.length;
        if (closes) fence = null;
        return line;
      }
      if (fenceMatch) {
        fence = fenceMatch[1];
        return line;
      }

      return line
        .split(INLINE_CODE_PATTERN)
        .map((part, i) => (i % 2 === 1 ? part : fn(part)))
        .join("");
    })
    .join("\n");
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const dot = file.name.lastIndexOf(".");
  return dot !== -1 && IMAGE_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

/**
 * The key used to match a markdown src against an uploaded file's name.
 * Compares basenames only, so `./images/a.png`, `images/a.png` and `../a.png` all
 * resolve to the same file, and percent-encoded paths (`a%20b.png`) still match.
 */
export function imageKey(pathOrName: string): string {
  const withoutQuery = pathOrName.split(/[?#]/)[0];
  const lastSegment = withoutQuery.split("/").pop() ?? "";
  let decoded = lastSegment;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    // Malformed escape sequence — fall back to the raw segment.
  }
  return decoded.toLowerCase();
}

/**
 * True when a src is a relative path we may rewrite.
 * Remote (`https://`), protocol-relative (`//`), root-absolute (`/uploads/…`) and inline
 * (`data:`) srcs are left alone — they already resolve, or were never a local file.
 */
export function isRewritableSrc(src: string): boolean {
  return !(
    /^[a-z][a-z0-9+.-]*:/i.test(src) ||
    src.startsWith("//") ||
    src.startsWith("/")
  );
}

export interface MarkdownImageRef {
  /** The full matched markdown, e.g. `![diagram](./images/a.png)`. */
  raw: string;
  alt: string;
  src: string;
  /** Optional title including its leading whitespace, e.g. ` "Figure 1"`. */
  title: string;
}

/** Every image reference in the document's prose, in order. Code is skipped. */
export function extractImageRefs(markdown: string): MarkdownImageRef[] {
  const refs: MarkdownImageRef[] = [];

  transformOutsideCode(markdown, (text) => {
    for (const match of text.matchAll(IMAGE_REF_PATTERN)) {
      refs.push({
        raw: match[0],
        alt: match[1],
        src: match[2],
        title: match[3] ?? "",
      });
    }
    return text;
  });

  return refs;
}

/** Keys of the relative image srcs that an uploaded file could satisfy. */
export function extractRewritableImageKeys(markdown: string): string[] {
  const keys = new Set<string>();
  for (const ref of extractImageRefs(markdown)) {
    if (isRewritableSrc(ref.src)) keys.add(imageKey(ref.src));
  }
  return [...keys];
}

/**
 * Point relative image srcs at their uploaded URLs.
 *
 * @param markdown - Content with local image paths.
 * @param mapping - `imageKey(fileName)` → served URL. Keys with no entry are left as-is.
 */
export function rewriteImageSrcs(
  markdown: string,
  mapping: Map<string, string>
): string {
  if (mapping.size === 0) return markdown;

  return transformOutsideCode(markdown, (text) =>
    text.replace(
      IMAGE_REF_PATTERN,
      (raw: string, alt: string, src: string, title: string | undefined) => {
        if (!isRewritableSrc(src)) return raw;
        const url = mapping.get(imageKey(src));
        if (!url) return raw;
        return `![${alt}](${url}${title ?? ""})`;
      }
    )
  );
}
