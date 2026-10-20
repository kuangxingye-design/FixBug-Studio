import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { contentTypeFor, resolveMediaPath } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves uploaded media from outside `public/`.
 *
 * Files are written at runtime, and Next.js only serves `public/` entries that existed at
 * build time — so uploads have to go through a route handler to work in production.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const filePath = resolveMediaPath(filename);
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const data = await readFile(filePath);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(filename),
        "Content-Length": String(info.size),
        // Names are content-unique UUIDs, so a given URL's bytes never change.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
