import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// User — 用户
// ============================================================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  role: text("role", { enum: ["guest", "user", "admin"] })
    .notNull()
    .default("user"),
  status: text("status", { enum: ["active", "disabled"] })
    .notNull()
    .default("active"),
  preferences: text("preferences"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================
// Article — 文章
// ============================================================
export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(), // Markdown
  contentHtml: text("content_html"), // Pre-rendered HTML
  coverImage: text("cover_image"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  tags: text("tags"), // JSON array string, e.g. '["Rust","async"]'
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
});

// ============================================================
// Comment — 评论 (self-referencing for nested replies)
// ============================================================
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(), // Markdown
  contentHtml: text("content_html"), // Pre-rendered HTML
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  parentId: integer("parent_id"), // Self-reference for nested replies
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================
// Like — 点赞 (unique on article + user)
// ============================================================
export const likes = sqliteTable(
  "likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueArticleUser: uniqueIndex("idx_likes_article_user").on(
      table.articleId,
      table.userId
    ),
  })
);

// ============================================================
// AppEntry — 应用入口
// ============================================================
export const appEntries = sqliteTable("app_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  proxyPath: text("proxy_path").notNull().unique(), // e.g. /app/tool
  targetUrl: text("target_url").notNull(), // e.g. http://127.0.0.1:8080
  openMode: text("open_mode", {
    enum: ["open", "login_required", "admin_only"],
  })
    .notNull()
    .default("login_required"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================
// SiteConfig — 站点配置 (KV store)
// ============================================================
export const siteConfigs = sqliteTable("site_configs", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ============================================================
// AIAuditLog — AI 审计日志 (Phase 2, schema ready now)
// ============================================================
export const aiAuditLogs = sqliteTable("ai_audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  traceId: text("trace_id").notNull(),
  sessionId: text("session_id"),
  userId: integer("user_id").references(() => users.id),
  userIntent: text("user_intent"), // Original user input
  agentPlan: text("agent_plan"), // JSON: AI planning steps
  toolCalls: text("tool_calls"), // JSON: actual tool invocations
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  latencyMs: integer("latency_ms"),
  costEstimate: text("cost_estimate"), // stringified float
  status: text("status", {
    enum: ["success", "partial", "failed", "degraded"],
  }).notNull().default("success"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================
// ChatSession — 会话记录
// ============================================================
export const chatSessions = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  sessionToken: text("session_token").notNull().unique(), // UUID for client reference
  messages: text("messages").notNull().default("[]"), // JSON array of messages
  context: text("context").notNull().default("{}"), // JSON: current page, article, etc.
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});
