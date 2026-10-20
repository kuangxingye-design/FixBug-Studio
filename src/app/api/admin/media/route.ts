import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { MEDIA_URL_PREFIX, UPLOAD_DIR } from "@/lib/media/storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "24");

  const results = await db
    .select()
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(media);

  return NextResponse.json({
    media: results,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create DB record
    const url = `${MEDIA_URL_PREFIX}/${uniqueName}`;
    const [record] = await db
      .insert(media)
      .values({
        filename: uniqueName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        width: null,
        height: null,
        url,
        altText: null,
      })
      .returning();

    return NextResponse.json({ media: record }, { status: 201 });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
