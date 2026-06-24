import { z } from "zod";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import type { ToolDefinition } from "../types.js";
import type { AuthenticatedRequest } from "../types.js";
import { db } from "../../db/connection.js";
import { comments, articles, users } from "../../db/schema.js";
import { renderMarkdown } from "../../lib/markdown.js";

// ============================================================
// T-12: create_comment — 创建评论（支持嵌套回复）
// ============================================================

const createCommentSchema = z.object({
  article_id: z.coerce.number().int().positive(),
  content: z.string().min(1, "评论内容不能为空").max(5000),
  parent_id: z.coerce.number().int().positive().optional().describe("回复某条评论的 ID"),
});

type CreateCommentParams = z.infer<typeof createCommentSchema>;

export const createCommentTool: ToolDefinition<
  typeof createCommentSchema,
  Record<string, unknown>
> = {
  name: "create_comment",
  description: "在文章下发布评论。支持 parent_id 嵌套回复。需要登录。",
  schema: createCommentSchema,
  permission: "user",
  sideEffect: "write",
  confirmation: "never",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params: CreateCommentParams, req: AuthenticatedRequest) {
    // Verify article exists and is published
    const [article] = await db
      .select({ id: articles.id, status: articles.status })
      .from(articles)
      .where(
        and(eq(articles.id, params.article_id), eq(articles.isDeleted, false))
      )
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    if (article.status !== "published") {
      throw Object.assign(new Error("不能对未发布的文章发表评论"), {
        statusCode: 400,
      });
    }

    // If parent_id is provided, verify it exists and belongs to the same article
    if (params.parent_id) {
      const [parent] = await db
        .select({ id: comments.id, articleId: comments.articleId })
        .from(comments)
        .where(
          and(
            eq(comments.id, params.parent_id),
            eq(comments.isDeleted, false)
          )
        )
        .limit(1);

      if (!parent) {
        throw Object.assign(new Error("被回复的评论不存在或已删除"), {
          statusCode: 404,
        });
      }

      if (parent.articleId !== params.article_id) {
        throw Object.assign(new Error("不能跨文章回复评论"), {
          statusCode: 400,
        });
      }
    }

    // Render markdown content to HTML
    const contentHtml = await renderMarkdown(params.content);

    const [comment] = await db
      .insert(comments)
      .values({
        content: params.content,
        contentHtml,
        articleId: params.article_id,
        authorId: req.user!.id,
        parentId: params.parent_id ?? null,
        isDeleted: false,
        createdAt: new Date(),
      })
      .returning();

    return {
      id: comment.id,
      content: comment.content,
      content_html: comment.contentHtml,
      article_id: comment.articleId,
      author_id: comment.authorId,
      parent_id: comment.parentId,
      created_at: comment.createdAt,
    };
  },
};

// ============================================================
// T-13: delete_comment — 软删除评论
// ============================================================

const deleteCommentSchema = z.object({
  comment_id: z.coerce.number().int().positive(),
});

type DeleteCommentParams = z.infer<typeof deleteCommentSchema>;

export const deleteCommentTool: ToolDefinition<
  typeof deleteCommentSchema,
  { deleted: boolean }
> = {
  name: "delete_comment",
  description:
    "软删除评论。评论作者可删除自己的评论，管理员可删除任意评论。",
  schema: deleteCommentSchema,
  permission: "user",
  sideEffect: "destroy",
  confirmation: "always",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params: DeleteCommentParams, req: AuthenticatedRequest) {
    const [comment] = await db
      .select({
        id: comments.id,
        authorId: comments.authorId,
        isDeleted: comments.isDeleted,
      })
      .from(comments)
      .where(eq(comments.id, params.comment_id))
      .limit(1);

    if (!comment || comment.isDeleted) {
      throw Object.assign(new Error("评论不存在或已删除"), {
        statusCode: 404,
      });
    }

    // Check ownership: author or admin
    const isAdmin = req.user!.role === "admin";
    const isOwner = comment.authorId === req.user!.id;

    if (!isAdmin && !isOwner) {
      throw Object.assign(new Error("只能删除自己的评论"), {
        statusCode: 403,
      });
    }

    await db
      .update(comments)
      .set({ isDeleted: true })
      .where(eq(comments.id, params.comment_id));

    return { deleted: true };
  },
};

// ============================================================
// T-14: list_comments — 文章评论列表（嵌套结构）
// ============================================================

const listCommentsSchema = z.object({
  article_id: z.coerce.number().int().positive(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort_by: z.enum(["latest", "oldest"]).optional().default("latest"),
});

type ListCommentsParams = z.infer<typeof listCommentsSchema>;

/** Comment tree node — top-level comments have nested replies */
interface CommentNode {
  id: number;
  content: string;
  content_html: string | null;
  article_id: number;
  author: {
    id: number;
    nickname: string;
    avatar: string | null;
  };
  parent_id: number | null;
  created_at: Date;
  replies: CommentNode[];
}

export const listCommentsTool: ToolDefinition<
  typeof listCommentsSchema,
  { comments: CommentNode[]; total: number; page: number; page_size: number }
> = {
  name: "list_comments",
  description:
    "获取文章评论列表（分页），支持嵌套回复结构。按最新或最早排序。",
  schema: listCommentsSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: ListCommentsParams) {
    const orderBy =
      params.sort_by === "oldest"
        ? asc(comments.createdAt)
        : desc(comments.createdAt);

    // Count top-level (non-reply) comments for pagination
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.articleId, params.article_id),
          eq(comments.isDeleted, false),
          isNull(comments.parentId)
        )
      );
    const total = totalRow?.count ?? 0;

    // Fetch all non-deleted comments for this article
    // (we need them all to build nested structure properly)
    const allRows = await db
      .select({
        id: comments.id,
        content: comments.content,
        contentHtml: comments.contentHtml,
        articleId: comments.articleId,
        authorId: comments.authorId,
        parentId: comments.parentId,
        createdAt: comments.createdAt,
        authorNickname: users.nickname,
        authorAvatar: users.avatar,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.articleId, params.article_id),
          eq(comments.isDeleted, false)
        )
      )
      .orderBy(orderBy);

    // Separate top-level and replies
    const topLevel: typeof allRows = [];
    const replies = new Map<number, typeof allRows>();

    for (const row of allRows) {
      if (row.parentId === null) {
        topLevel.push(row);
      } else {
        const list = replies.get(row.parentId) || [];
        list.push(row);
        replies.set(row.parentId, list);
      }
    }

    // Paginate top-level comments
    const offset = (params.page - 1) * params.page_size;
    const pagedTopLevel = topLevel.slice(offset, offset + params.page_size);

    // Build tree recursively
    function buildTree(rows: typeof pagedTopLevel): CommentNode[] {
      return rows.map((row) => ({
        id: row.id,
        content: row.content,
        content_html: row.contentHtml,
        article_id: row.articleId,
        author: {
          id: row.authorId,
          nickname: row.authorNickname ?? "Anonymous",
          avatar: row.authorAvatar,
        },
        parent_id: row.parentId,
        created_at: row.createdAt,
        replies: buildTree(replies.get(row.id) || []),
      }));
    }

    return {
      comments: buildTree(pagedTopLevel),
      total,
      page: params.page,
      page_size: params.page_size,
    };
  },
};

// ============================================================
// T-15: get_comment_count — 文章评论总数
// ============================================================

const getCommentCountSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type GetCommentCountParams = z.infer<typeof getCommentCountSchema>;

export const getCommentCountTool: ToolDefinition<
  typeof getCommentCountSchema,
  { count: number }
> = {
  name: "get_comment_count",
  description: "获取文章评论总数（不含已删除）。",
  schema: getCommentCountSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetCommentCountParams) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.articleId, params.article_id),
          eq(comments.isDeleted, false)
        )
      );

    return { count: row?.count ?? 0 };
  },
};
