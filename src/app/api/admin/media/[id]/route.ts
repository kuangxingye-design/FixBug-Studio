import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";
import { resolveMediaPath } from "@/lib/media/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const mediaId = parseInt(id);

  const [record] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  if (!record) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Delete file from disk
  try {
    const filePath = resolveMediaPath(record.filename);
    if (filePath) await unlink(filePath);
  } catch {
    // File might already be gone
  }

  // Delete record
  await db.delete(media).where(eq(media.id, mediaId));

  return NextResponse.json({ success: true });
}
