import { z } from "zod";
import { eq, like, and, or, ne, lt, gt, desc, asc, sql } from "drizzle-orm";
import type { ToolDefinition } from "../types.js";
import type { AuthenticatedRequest } from "../types.js";
import { db } from "../../db/connection.js";
import { articles, comments } from "../../db/schema.js";
import { renderMarkdown, extractToc, generateExcerpt } from "../../lib/markdown.js";
import { generateSlug, regenerateSlug } from "../../lib/slug.js";

// ============================================================
// Shared helpers
// ============================================================

/** Parse JSON tags string to string array */
function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/** Build Drizzle where conditions from list filters */
function buildListConditions(opts: {
  status?: string;
  tag?: string;
  search?: string;
}) {
  const conditions = [eq(articles.isDeleted, false)];

  if (opts.status) {
    conditions.push(
      eq(articles.status, opts.status as "draft" | "published")
    );
  }

  if (opts.tag) {
    // Tag stored as JSON array string — use LIKE for simple matching
    conditions.push(like(articles.tags, `%${opts.tag}%`));
  }

  if (opts.search) {
    conditions.push(
      or(
        like(articles.title, `%${opts.search}%`),
        like(articles.content, `%${opts.search}%`)
      )!
    );
  }

  return and(...conditions);
}

// ============================================================
// T-01: create_article
// ============================================================

const createArticleSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  content: z.string().min(1, "内容不能为空"),
  summary: z.string().max(500).optional(),
  cover_image: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

type CreateArticleParams = z.infer<typeof createArticleSchema>;

export const createArticleTool: ToolDefinition<
  typeof createArticleSchema,
  Record<string, unknown>
> = {
  name: "create_article",
  description: "创建新文章（默认草稿状态）。标题和内容为必填。",
  schema: createArticleSchema,
  permission: "admin",
  sideEffect: "write",
  confirmation: "conditional",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params: CreateArticleParams, req: AuthenticatedRequest) {
    const slug = await generateSlug(params.title);
    const contentHtml = await renderMarkdown(params.content);
    const summary =
      params.summary || generateExcerpt(params.content, 200);
    const tags = params.tags ? JSON.stringify(params.tags) : null;

    const [article] = await db
      .insert(articles)
      .values({
        title: params.title,
        slug,
        summary,
        content: params.content,
        contentHtml,
        coverImage: params.cover_image ?? null,
        status: params.status ?? "draft",
        authorId: req.user!.id,
        tags,
        publishedAt:
          params.status === "published" ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
        likeCount: 0,
        isDeleted: false,
      })
      .returning();

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      created_at: article.createdAt,
    };
  },
};

// ============================================================
// T-02: update_article
// ============================================================

const updateArticleSchema = z.object({
  article_id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  cover_image: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

type UpdateArticleParams = z.infer<typeof updateArticleSchema>;

export const updateArticleTool: ToolDefinition<
  typeof updateArticleSchema,
  Record<string, unknown>
> = {
  name: "update_article",
  description: "编辑已有文章，支持部分更新。",
  schema: updateArticleSchema,
  permission: "admin",
  sideEffect: "write",
  confirmation: "never",
  rateLimit: { max: 20, windowSeconds: 60 },

  async handler(params: UpdateArticleParams) {
    // Check article exists
    const [existing] = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    // Build update data
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (params.title !== undefined) {
      updates.title = params.title;
      updates.slug = await regenerateSlug(
        params.title,
        existing.slug,
        params.article_id
      );
    }

    if (params.content !== undefined) {
      updates.content = params.content;
      updates.contentHtml = await renderMarkdown(params.content);
      // Update summary if not explicitly provided, regenerate from content
      if (params.summary === undefined) {
        updates.summary = generateExcerpt(params.content, 200);
      }
    }

    if (params.summary !== undefined) {
      updates.summary = params.summary;
    }

    if (params.cover_image !== undefined) {
      updates.coverImage = params.cover_image;
    }

    if (params.tags !== undefined) {
      updates.tags = JSON.stringify(params.tags);
    }

    const [updated] = await db
      .update(articles)
      .set(updates)
      .where(eq(articles.id, params.article_id))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      summary: updated.summary,
      updated_at: updated.updatedAt,
    };
  },
};

// ============================================================
// T-03: delete_article (soft delete)
// ============================================================

const deleteArticleSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type DeleteArticleParams = z.infer<typeof deleteArticleSchema>;

export const deleteArticleTool: ToolDefinition<
  typeof deleteArticleSchema,
  { deleted: boolean }
> = {
  name: "delete_article",
  description: "软删除文章（设置删除标记，不物理删除数据）。",
  schema: deleteArticleSchema,
  permission: "admin",
  sideEffect: "destroy",
  confirmation: "always",
  rateLimit: { max: 5, windowSeconds: 60 },

  async handler(params: DeleteArticleParams) {
    const [existing] = await db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error("文章不存在或已删除"), {
        statusCode: 404,
      });
    }

    await db
      .update(articles)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(articles.id, params.article_id));

    return { deleted: true };
  },
};

// ============================================================
// T-04: publish_article
// ============================================================

const publishArticleSchema = z.object({
  article_id: z.coerce.number().int().positive(),
  publish_at: z.string().datetime().optional().describe("定时发布时间（ISO 8601）"),
});

type PublishArticleParams = z.infer<typeof publishArticleSchema>;

export const publishArticleTool: ToolDefinition<
  typeof publishArticleSchema,
  Record<string, unknown>
> = {
  name: "publish_article",
  description: "将草稿发布为公开文章，支持定时发布。",
  schema: publishArticleSchema,
  permission: "admin",
  sideEffect: "write",
  confirmation: "always",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params: PublishArticleParams) {
    const [existing] = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    if (existing.status === "published") {
      throw Object.assign(new Error("文章已经是发布状态"), {
        statusCode: 409,
      });
    }

    const publishAt = params.publish_at
      ? new Date(params.publish_at)
      : new Date();

    const [updated] = await db
      .update(articles)
      .set({
        status: "published",
        publishedAt: publishAt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, params.article_id))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      status: updated.status,
      published_at: updated.publishedAt,
    };
  },
};

// ============================================================
// T-05: unpublish_article
// ============================================================

const unpublishArticleSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type UnpublishArticleParams = z.infer<typeof unpublishArticleSchema>;

export const unpublishArticleTool: ToolDefinition<
  typeof unpublishArticleSchema,
  Record<string, unknown>
> = {
  name: "unpublish_article",
  description: "将已发布文章转为草稿。",
  schema: unpublishArticleSchema,
  permission: "admin",
  sideEffect: "write",
  confirmation: "always",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params: UnpublishArticleParams) {
    const [existing] = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    if (existing.status !== "published") {
      throw Object.assign(new Error("文章不是发布状态"), {
        statusCode: 409,
      });
    }

    const [updated] = await db
      .update(articles)
      .set({
        status: "draft",
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, params.article_id))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      status: updated.status,
    };
  },
};

// ============================================================
// T-06: get_article
// ============================================================

const getArticleSchema = z.object({
  slug: z.string().optional().describe("文章 slug"),
  article_id: z.coerce.number().int().positive().optional().describe("文章 ID"),
}).refine((d) => d.slug || d.article_id, {
  message: "请提供 slug 或 article_id",
});

type GetArticleParams = z.infer<typeof getArticleSchema>;

export const getArticleTool: ToolDefinition<
  typeof getArticleSchema,
  Record<string, unknown>
> = {
  name: "get_article",
  description: "获取文章详情（含渲染后 HTML）。通过 slug 或 ID 查询。",
  schema: getArticleSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 60, windowSeconds: 60 },

  async handler(params: GetArticleParams) {
    const conditions = [eq(articles.isDeleted, false)];

    if (params.slug) {
      conditions.push(eq(articles.slug, params.slug));
    } else if (params.article_id) {
      conditions.push(eq(articles.id, params.article_id));
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(and(...conditions))
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    // Increment view count
    await db
      .update(articles)
      .set({ viewCount: article.viewCount + 1 })
      .where(eq(articles.id, article.id));

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      content_html: article.contentHtml,
      cover_image: article.coverImage,
      tags: parseTags(article.tags),
      status: article.status,
      author_id: article.authorId,
      published_at: article.publishedAt,
      created_at: article.createdAt,
      updated_at: article.updatedAt,
      view_count: article.viewCount + 1,
      like_count: article.likeCount,
    };
  },
};

// ============================================================
// T-07: list_articles
// ============================================================

const listArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(50).optional().default(10),
  tag: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  sort_by: z.enum(["latest", "popular"]).optional().default("latest"),
  search: z.string().max(200).optional(),
});

type ListArticlesParams = z.infer<typeof listArticlesSchema>;

export const listArticlesTool: ToolDefinition<
  typeof listArticlesSchema,
  { articles: unknown[]; total: number; page: number; page_size: number }
> = {
  name: "list_articles",
  description:
    "分页获取文章列表，支持按标签、状态、排序方式筛选，以及全文搜索。",
  schema: listArticlesSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: ListArticlesParams) {
    const conditions = buildListConditions({
      status: params.status,
      tag: params.tag,
      search: params.search,
    });

    // Count total
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(conditions);
    const total = totalRow?.count ?? 0;

    // Determine sort
    const orderBy =
      params.sort_by === "popular"
        ? desc(articles.likeCount)
        : desc(articles.publishedAt);

    const offset = (params.page - 1) * params.page_size;

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        cover_image: articles.coverImage,
        tags: articles.tags,
        status: articles.status,
        published_at: articles.publishedAt,
        created_at: articles.createdAt,
        view_count: articles.viewCount,
        like_count: articles.likeCount,
      })
      .from(articles)
      .where(conditions)
      .orderBy(orderBy)
      .limit(params.page_size)
      .offset(offset);

    return {
      articles: rows.map((a) => ({
        ...a,
        tags: parseTags(a.tags),
      })),
      total,
      page: params.page,
      page_size: params.page_size,
    };
  },
};

// ============================================================
// T-08: upload_markdown_file
// Note: This tool needs special handling for multipart uploads.
// Registered separately via a custom Fastify route.
// ============================================================

const uploadMarkdownSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const uploadMarkdownFileTool: ToolDefinition<
  typeof uploadMarkdownSchema,
  Record<string, unknown>
> = {
  name: "upload_markdown_file",
  description: "上传 .md 文件并解析为文章内容。",
  schema: uploadMarkdownSchema,
  permission: "admin",
  sideEffect: "write",
  confirmation: "never",
  rateLimit: { max: 10, windowSeconds: 60 },

  async handler(params, req: AuthenticatedRequest) {
    // This handler is a placeholder — the actual multipart parsing
    // is done in a custom route registered separately.
    // See registerUploadRoute() below.
    throw new Error("This tool must be called via the multipart upload route");
  },
};

// ============================================================
// T-09: get_article_toc
// ============================================================

const getArticleTocSchema = z.object({
  slug: z.string().optional(),
  article_id: z.coerce.number().int().positive().optional(),
}).refine((d) => d.slug || d.article_id, {
  message: "请提供 slug 或 article_id",
});

type GetArticleTocParams = z.infer<typeof getArticleTocSchema>;

export const getArticleTocTool: ToolDefinition<
  typeof getArticleTocSchema,
  { toc: unknown[] }
> = {
  name: "get_article_toc",
  description: "获取文章目录结构（从渲染 HTML 提取标题层级）。",
  schema: getArticleTocSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetArticleTocParams) {
    const conditions = [eq(articles.isDeleted, false)];

    if (params.slug) {
      conditions.push(eq(articles.slug, params.slug));
    } else if (params.article_id) {
      conditions.push(eq(articles.id, params.article_id));
    }

    const [article] = await db
      .select({
        content_html: articles.contentHtml,
        title: articles.title,
      })
      .from(articles)
      .where(and(...conditions))
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    const toc = extractToc(article.content_html ?? "");
    return { toc };
  },
};

// ============================================================
// T-10: get_adjacent_articles
// ============================================================

const getAdjacentArticlesSchema = z.object({
  article_id: z.coerce.number().int().positive(),
  tag: z.string().optional().describe("限定同标签"),
});

type GetAdjacentArticlesParams = z.infer<typeof getAdjacentArticlesSchema>;

export const getAdjacentArticlesTool: ToolDefinition<
  typeof getAdjacentArticlesSchema,
  { previous: unknown | null; next: unknown | null }
> = {
  name: "get_adjacent_articles",
  description: "获取上一篇文章和下一篇文章，可选限定同标签。",
  schema: getAdjacentArticlesSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetAdjacentArticlesParams) {
    // Get current article's published_at
    const [current] = await db
      .select({
        published_at: articles.publishedAt,
        tags: articles.tags,
      })
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false),
          eq(articles.status, "published")
        )
      )
      .limit(1);

    if (!current) {
      return { previous: null, next: null };
    }

    const baseConditions = [
      eq(articles.status, "published"),
      eq(articles.isDeleted, false),
    ];

    if (params.tag) {
      baseConditions.push(like(articles.tags, `%${params.tag}%`));
    }

    // Previous: published before current, ordered desc
    const prevConditions = [
      ...baseConditions,
      lt(articles.publishedAt, current.published_at ?? new Date(0)),
    ];
    const [previous] = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        published_at: articles.publishedAt,
      })
      .from(articles)
      .where(and(...prevConditions))
      .orderBy(desc(articles.publishedAt))
      .limit(1);

    // Next: published after current, ordered asc
    const nextConditions = [
      ...baseConditions,
      gt(articles.publishedAt, current.published_at ?? new Date(0)),
    ];
    const [next] = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        published_at: articles.publishedAt,
      })
      .from(articles)
      .where(and(...nextConditions))
      .orderBy(asc(articles.publishedAt))
      .limit(1);

    return {
      previous: previous || null,
      next: next || null,
    };
  },
};

// ============================================================
// T-11: get_article_stats
// ============================================================

const getArticleStatsSchema = z.object({
  article_id: z.coerce.number().int().positive(),
});

type GetArticleStatsParams = z.infer<typeof getArticleStatsSchema>;

export const getArticleStatsTool: ToolDefinition<
  typeof getArticleStatsSchema,
  Record<string, number>
> = {
  name: "get_article_stats",
  description: "获取文章统计数据：阅读量、点赞数、评论数。",
  schema: getArticleStatsSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetArticleStatsParams) {
    const [article] = await db
      .select({
        view_count: articles.viewCount,
        like_count: articles.likeCount,
      })
      .from(articles)
      .where(
        and(
          eq(articles.id, params.article_id),
          eq(articles.isDeleted, false)
        )
      )
      .limit(1);

    if (!article) {
      throw Object.assign(new Error("文章不存在"), { statusCode: 404 });
    }

    // Count non-deleted comments
    const [commentRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.articleId, params.article_id),
          eq(comments.isDeleted, false)
        )
      );

    return {
      view_count: article.view_count,
      like_count: article.like_count,
      comment_count: commentRow?.count ?? 0,
    };
  },
};
