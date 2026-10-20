import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: "Invalid tag ID" }, { status: 400 });
  }

  await db.delete(tags).where(eq(tags.id, tagId));

  return NextResponse.json({ success: true });
}
