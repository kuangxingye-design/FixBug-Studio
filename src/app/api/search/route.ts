import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/search";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!q.trim()) {
    return NextResponse.json({ articles: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
  }

  const { articles, total } = await searchArticles(q, page, limit);

  return NextResponse.json({
    articles,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
