import path from "path";

/**
 * Where uploaded media is stored on disk.
 *
 * Deliberately outside `public/`: Next.js resolves the set of `public/` files at build
 * time, so a file written there by an already-running server is not served in production
 * (it 404s, while dev serves it fine). Every upload happens at runtime, so these files are
 * streamed by the route handler in `app/uploads/images/[filename]` instead — one code path
 * that behaves the same in dev and production.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "images");

/** Public URL prefix for stored media, handled by the route handler above. */
export const MEDIA_URL_PREFIX = "/uploads/images";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

/** Best-effort content type from the extension; stored files are usually images. */
export function contentTypeFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot === -1 ? "" : filename.slice(dot).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Absolute path for a stored file, or null when `filename` isn't a plain file name.
 * Rejects path separators and `..` so a crafted URL cannot escape the upload directory.
 */
export function resolveMediaPath(filename: string): string | null {
  if (!filename || filename !== path.basename(filename) || filename.includes("..")) {
    return null;
  }
  return path.join(UPLOAD_DIR, filename);
}
