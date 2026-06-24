import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import type { ToolDefinition } from "../types.js";
import type { AuthenticatedRequest } from "../types.js";
import { db } from "../../db/connection.js";
import { likes, articles } from "../../db/schema.js";

// ============================================================
// T-16: toggle_like — 点赞/取消点赞
// ============================================================

const toggleLikeSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type ToggleLikeParams = z.infer<typeof toggleLikeSchema>;

export const toggleLikeTool: ToolDefinition<
  typeof toggleLikeSchema,
  { liked: boolean; count: number }
> = {
  name: "toggle_like",
  description:
    "切换文章点赞状态：已点赞则取消，未点赞则点赞。需要登录。",
  schema: toggleLikeSchema,
  permission: "user",
  sideEffect: "write",
  confirmation: "never",
  rateLimit: { max: 20, windowSeconds: 60 },

  async handler(params: ToggleLikeParams, req: AuthenticatedRequest) {
    const userId = req.user!.id;
    const articleId = params.article_id;

    // Verify article exists and is published
    const [article] = await db
      .select({ id: articles.id, status: articles.status, likeCount: articles.likeCount })
      .from(articles)
      .where(
        and(eq(articles.id, articleId), eq(articles.isDeleted, false))
      )
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    if (article.status !== "published") {
      throw Object.assign(new Error("不能对未发布的文章点赞"), {
        statusCode: 400,
      });
    }

    // Check if user already liked this article
    const [existing] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(eq(likes.articleId, articleId), eq(likes.userId, userId))
      )
      .limit(1);

    if (existing) {
      // Unlike: remove the like record
      await db.delete(likes).where(eq(likes.id, existing.id));

      // Decrement article like_count (floor at 0)
      await db
        .update(articles)
        .set({
          likeCount: sql`MAX(0, ${articles.likeCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(articles.id, articleId));

      // Query updated count
      const [updated] = await db
        .select({ likeCount: articles.likeCount })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      return { liked: false, count: updated?.likeCount ?? 0 };
    } else {
      // Like: insert with UNIQUE constraint handled by schema
      await db.insert(likes).values({
        articleId,
        userId,
        createdAt: new Date(),
      });

      // Increment article like_count
      await db
        .update(articles)
        .set({
          likeCount: sql`${articles.likeCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(articles.id, articleId));

      // Query updated count
      const [updated] = await db
        .select({ likeCount: articles.likeCount })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      return { liked: true, count: updated?.likeCount ?? 0 };
    }
  },
};

// ============================================================
// T-17: get_like_status — 查询当前用户点赞状态
// ============================================================

const getLikeStatusSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type GetLikeStatusParams = z.infer<typeof getLikeStatusSchema>;

export const getLikeStatusTool: ToolDefinition<
  typeof getLikeStatusSchema,
  { liked: boolean }
> = {
  name: "get_like_status",
  description: "查询当前用户对指定文章的点赞状态。需要登录。",
  schema: getLikeStatusSchema,
  permission: "user",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetLikeStatusParams, req: AuthenticatedRequest) {
    const [row] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(
          eq(likes.articleId, params.article_id),
          eq(likes.userId, req.user!.id)
        )
      )
      .limit(1);

    return { liked: !!row };
  },
};

// ============================================================
// T-18: get_like_count — 文章点赞总数
// ============================================================

const getLikeCountSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type GetLikeCountParams = z.infer<typeof getLikeCountSchema>;

export const getLikeCountTool: ToolDefinition<
  typeof getLikeCountSchema,
  { count: number }
> = {
  name: "get_like_count",
  description: "获取文章点赞总数。所有人可访问。",
  schema: getLikeCountSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetLikeCountParams) {
    const [article] = await db
      .select({ likeCount: articles.likeCount })
      .from(articles)
      .where(
        and(eq(articles.id, params.article_id), eq(articles.isDeleted, false))
      )
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    return { count: article.likeCount };
  },
};
