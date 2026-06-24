import type { FastifyInstance } from "fastify";
import { registerTool, mountAllToolRoutes } from "./router.js";
import { toolRegistry } from "./registry.js";
import { getSiteConfigTool } from "./definitions/site-config.js";
import {
  createArticleTool,
  updateArticleTool,
  deleteArticleTool,
  publishArticleTool,
  unpublishArticleTool,
  getArticleTool,
  listArticlesTool,
  uploadMarkdownFileTool,
  getArticleTocTool,
  getAdjacentArticlesTool,
  getArticleStatsTool,
} from "./definitions/articles.js";
import {
  createCommentTool,
  deleteCommentTool,
  listCommentsTool,
  getCommentCountTool,
} from "./definitions/comments.js";
import {
  toggleLikeTool,
  getLikeStatusTool,
  getLikeCountTool,
} from "./definitions/likes.js";
import { renderMarkdown } from "../lib/markdown.js";
import { db } from "../db/connection.js";
import { articles } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { generateSlug } from "../lib/slug.js";
import { generateExcerpt } from "../lib/markdown.js";

// ============================================================
// Tool Registration — register all tools with their routes
// ============================================================

/**
 * Register all tools and mount their routes on the Fastify app.
 * This is the single entry point called from server.ts.
 */
export async function registerAllTools(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------
  // Site Config tools
  // -------------------------------------------------------------------
  registerTool(getSiteConfigTool, {
    method: "GET",
    path: "/site-config",
    paramSource: "query",
  });

  // -------------------------------------------------------------------
  // Article tools (T-01 ~ T-11)
  // -------------------------------------------------------------------
  registerTool(createArticleTool, {
    method: "POST",
    path: "/articles",
    paramSource: "body",
  });
  registerTool(updateArticleTool, {
    method: "PATCH",
    path: "/articles/:article_id",
    paramSource: "merged",
  });
  registerTool(deleteArticleTool, {
    method: "DELETE",
    path: "/articles/:article_id",
    paramSource: "merged",
  });
  registerTool(publishArticleTool, {
    method: "POST",
    path: "/articles/:article_id/publish",
    paramSource: "merged",
  });
  registerTool(unpublishArticleTool, {
    method: "POST",
    path: "/articles/:article_id/unpublish",
    paramSource: "merged",
  });
  registerTool(getArticleTool, {
    method: "GET",
    path: "/articles",
    paramSource: "query",
  });
  registerTool(listArticlesTool, {
    method: "GET",
    path: "/articles/list",
    paramSource: "query",
  });
  registerUploadMarkdownRoute(app);
  registerTool(getArticleTocTool, {
    method: "GET",
    path: "/articles/toc",
    paramSource: "query",
  });
  registerTool(getAdjacentArticlesTool, {
    method: "GET",
    path: "/articles/adjacent",
    paramSource: "query",
  });
  registerTool(getArticleStatsTool, {
    method: "GET",
    path: "/articles/stats",
    paramSource: "query",
  });

  // -------------------------------------------------------------------
  // Comment tools (T-12 ~ T-15)
  // -------------------------------------------------------------------
  registerTool(createCommentTool, {
    method: "POST",
    path: "/comments",
    paramSource: "body",
  });
  registerTool(deleteCommentTool, {
    method: "DELETE",
    path: "/comments/:comment_id",
    paramSource: "merged",
  });
  registerTool(listCommentsTool, {
    method: "GET",
    path: "/comments",
    paramSource: "query",
  });
  registerTool(getCommentCountTool, {
    method: "GET",
    path: "/comments/count",
    paramSource: "query",
  });

  // -------------------------------------------------------------------
  // Like tools (T-16 ~ T-18)
  // -------------------------------------------------------------------
  registerTool(toggleLikeTool, {
    method: "POST",
    path: "/likes/:article_id",
    paramSource: "merged",
  });
  registerTool(getLikeStatusTool, {
    method: "GET",
    path: "/likes/status",
    paramSource: "query",
  });
  registerTool(getLikeCountTool, {
    method: "GET",
    path: "/likes/count",
    paramSource: "query",
  });

  // -------------------------------------------------------------------
  // Mount all standard tool routes
  // -------------------------------------------------------------------
  mountAllToolRoutes(app);

  const names = toolRegistry.listNames();
  app.log.info(`Tools registered (${names.length}): ${names.join(", ")}`);
}

// ============================================================
// T-08: Upload Markdown File — custom multipart route
// ============================================================

function registerUploadMarkdownRoute(app: FastifyInstance): void {
  app.post(
    "/api/tools/articles/upload",
    {
      preHandler: [
        async (req, reply) => {
          const user = (req as any).user;
          if (!user || user.role !== "admin") {
            await reply.status(401).send({
              success: false,
              error: "请先以管理员身份登录",
              code: "UNAUTHORIZED",
            });
          }
        },
      ],
    },
    async (req, reply) => {
      try {
        const data = await req.file();
        if (!data) {
          await reply.status(400).send({
            success: false,
            error: "请上传 .md 文件",
            code: "NO_FILE",
          });
          return;
        }

        const buffer = await data.toBuffer();
        const content = buffer.toString("utf-8");
        const filename = data.filename || "untitled.md";

        if (!filename.endsWith(".md")) {
          await reply.status(400).send({
            success: false,
            error: "仅支持 .md 文件",
            code: "INVALID_FILE_TYPE",
          });
          return;
        }

        if (content.length > 5 * 1024 * 1024) {
          await reply.status(400).send({
            success: false,
            error: "文件大小不能超过 5MB",
            code: "FILE_TOO_LARGE",
          });
          return;
        }

        const fields = data.fields as Record<string, unknown> | undefined;

        function extractField(raw: unknown): string {
          if (!raw) return "";
          if (typeof raw === "string") return raw;
          if (typeof raw === "object" && "value" in (raw as Record<string, unknown>)) {
            return String((raw as Record<string, unknown>).value ?? "");
          }
          if (Array.isArray(raw)) return extractField(raw[0]);
          return "";
        }

        const title = extractField(fields?.title) || filename.replace(/\.md$/i, "");

        const tagsRaw = fields?.tags;
        const tags: string[] = [];
        if (tagsRaw) {
          const rawArr = Array.isArray(tagsRaw) ? tagsRaw : [tagsRaw];
          for (const item of rawArr) {
            const val = extractField(item);
            if (val) {
              tags.push(...val.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        }

        const contentHtml = await renderMarkdown(content);
        const summary = generateExcerpt(content, 200);
        const slug = await generateSlug(title);

        const [article] = await db
          .insert(articles)
          .values({
            title,
            slug,
            summary,
            content,
            contentHtml,
            status: "draft",
            authorId: (req as any).user!.id,
            tags: tags.length > 0 ? JSON.stringify(tags) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
            viewCount: 0,
            likeCount: 0,
            isDeleted: false,
          })
          .returning();

        await reply.status(201).send({
          success: true,
          data: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            status: article.status,
            tags,
            created_at: article.createdAt,
          },
        });
      } catch (err: any) {
        req.log.error({ err }, "Upload markdown file failed");
        if (err.statusCode) {
          await reply.status(err.statusCode).send({
            success: false,
            error: err.message,
          });
        } else {
          await reply.status(500).send({
            success: false,
            error: "文件上传处理失败",
            code: "UPLOAD_ERROR",
          });
        }
      }
    }
  );

  toolRegistry.register(uploadMarkdownFileTool);
}
