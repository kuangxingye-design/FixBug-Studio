# FixBug Studio — 详细开发流程与逐日任务规划

> 基于 REQUIREMENTS.md v2.0 Phase 1 MVP
> 单人开发，预估每日 4-6 小时有效编码时间
> 总计：20 个工作日（4 周），约 80-120 小时

---

## 开发原则

1. **垂直切片优先**：每一天结束时都应该有一个可运行、可验证的产出，而不是"写了一堆代码但跑不起来"。
2. **工具即能力**：后端所有功能以 Tool 为单位开发，开发顺序 = 工具编号顺序（T-01 → T-35）。
3. **先后端后前端**：前两周聚焦后端（工具层 + AI Agent），第三周开始前端，确保前端开发时所有 API 已就绪。
4. **每天结束时 commit + push**，提交信息遵循 Conventional Commits。

---

## 第一周：基础设施 + 文章/评论/点赞工具（Day 1-5）

### Day 1 — 项目脚手架 + 数据库

**目标**：项目能跑起来，数据库能连接，Drizzle 能生成迁移。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 1.1 | 初始化项目结构 | 创建 `packages/backend/` 和 `packages/frontend/`，根目录 `package.json` 配置 npm workspaces | 目录结构就绪 |
| 1.2 | TypeScript 配置 | 根 `tsconfig.json`（paths 配置共享类型），backend `tsconfig.json`（Node.js target），frontend `tsconfig.json`（由 Next.js 管理） | 类型系统就绪 |
| 1.3 | Backend 依赖安装 | `fastify`, `@fastify/cors`, `@fastify/cookie`, `@fastify/multipart`, `drizzle-orm`, `better-sqlite3`, `zod`, `bcryptjs`, `nanoid` | package.json 就绪 |
| 1.4 | Fastify 最小服务器 | `packages/backend/src/server.ts`：启动 Fastify，监听 3001 端口，`GET /api/health` 返回 `{ status: "ok" }` | 服务器可启动 |
| 1.5 | Drizzle 配置 | `drizzle.config.ts`，数据库连接模块 `packages/backend/src/db/connection.ts` | DB 连接就绪 |
| 1.6 | 全部 8 个实体的 Drizzle Schema | `packages/backend/src/db/schema.ts`：User, Article, Comment, Like, AppEntry, SiteConfig, AIAuditLog, ChatSession | Schema 定义完成 |
| 1.7 | 生成初始迁移 + 迁移脚本 | `npx drizzle-kit generate` + `npx drizzle-kit migrate`，创建 `packages/backend/src/db/migrate.ts` | 数据库表创建完成 |
| 1.8 | 种子数据脚本 | `packages/backend/src/db/seed.ts`：创建 admin 用户 + 2-3 篇示例文章 | 开发时有数据可看 |

**Day 1 结束验证**：
```bash
curl http://localhost:3001/api/health  # → { "status": "ok" }
npm -w packages/backend run db:migrate  # → 无报错，.db 文件生成
npm -w packages/backend run db:seed     # → admin 用户 + 示例文章入库
```

---

### Day 2 — 工具注册表基础设施 + 认证中间件

**目标**：Tool Registry 框架完成，auth 中间件可用，能注册并调用第一个工具。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 2.1 | Tool 类型定义 | `packages/backend/src/tools/types.ts`：定义 Tool 接口（name, description, schema, permission, sideEffect, confirmation, rateLimit, handler） | 类型系统 |
| 2.2 | Tool Registry 类 | `packages/backend/src/tools/registry.ts`：`register(tool)` / `get(name)` / `list()` / `getSchemas()`（导出 JSON Schema 给 AI） | 注册中心 |
| 2.3 | Zod → JSON Schema 工具函数 | `packages/backend/src/tools/schema-utils.ts`：将 Zod schema 转为 JSON Schema 供 AI 使用 | Schema 转换 |
| 2.4 | Session 管理 | `packages/backend/src/middleware/session.ts`：基于 Cookie 的 session 管理（游客/登录用户），session 数据存 SQLite | 会话系统 |
| 2.5 | Auth 中间件 | `packages/backend/src/middleware/auth.ts`：解析 session → 注入 `req.user`（id, role），提供 `requireRole(role)` 工厂函数 | 鉴权中间件 |
| 2.6 | Rate Limit 中间件 | `packages/backend/src/middleware/rate-limit.ts`：基于内存的简单速率限制，按工具配置 | 速率限制 |
| 2.7 | Tool 路由工厂 | `packages/backend/src/tools/router.ts`：通用的 `createToolRoute(tool)` 函数，自动注入 auth + rate-limit + 参数校验 + 错误处理 | 路由工厂 |
| 2.8 | 第一个工具：`get_site_config` | 实现 T-30 的子集作为验证：`GET /api/tools/site-config` | 端到端验证 |

**Day 2 结束验证**：
```bash
# 游客访问
curl http://localhost:3001/api/tools/site-config  # → 200, site config 数据
# 受保护工具（未登录）
curl -X POST http://localhost:3001/api/tools/articles  # → 401
```

---

### Day 3 — 文章工具（T-01 ~ T-11）

**目标**：完整的文章 CRUD 工具链，包含 Markdown 渲染。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 3.1 | Markdown 渲染服务 | `packages/backend/src/lib/markdown.ts`：unified + remark + rehype 管线，支持代码高亮、TOC 生成 | Markdown → HTML |
| 3.2 | Slug 生成工具 | `packages/backend/src/lib/slug.ts`：中文标题 → 拼音 slug，重名自动加后缀 | Slug 工具 |
| 3.3 | T-01 `create_article` | 创建文章（默认 draft），参数校验，权限 admin | 工具就绪 |
| 3.4 | T-02 `update_article` | 编辑文章，支持部分更新 | 工具就绪 |
| 3.5 | T-03 `delete_article` | 软删除文章（设置 deleted 标记） | 工具就绪 |
| 3.6 | T-04 `publish_article` | 草稿→已发布，支持定时发布（存 publish_at 字段） | 工具就绪 |
| 3.7 | T-05 `unpublish_article` | 已发布→草稿 | 工具就绪 |
| 3.8 | T-06 `get_article` | 按 slug 或 id 获取文章详情（含渲染后 HTML） | 工具就绪 |
| 3.9 | T-07 `list_articles` | 分页列表，支持 tag/status/sort/search 筛选 | 工具就绪 |
| 3.10 | T-08 `upload_markdown_file` | Multipart 文件上传，解析 .md 内容 | 工具就绪 |
| 3.11 | T-09 `get_article_toc` | 从渲染 HTML 提取标题层级生成目录 | 工具就绪 |
| 3.12 | T-10 `get_adjacent_articles` | 上一篇/下一篇，可选限定同标签 | 工具就绪 |
| 3.13 | T-11 `get_article_stats` | 阅读量 + 点赞数 + 评论数 | 工具就绪 |

**Day 3 结束验证**：
```bash
# 完整文章流程
curl -X POST /api/tools/articles -d '{"title":"Test","content":"# Hello"}'  # → 201
curl /api/tools/articles/test  # → 200, HTML 渲染后内容
curl -X PATCH /api/tools/articles/1 -d '{"title":"Updated"}'  # → 200
curl -X POST /api/tools/articles/1/publish  # → confirmation_card
```

---

### Day 4 — 评论工具 + 点赞工具（T-12 ~ T-18）

**目标**：完整的评论和点赞功能。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 4.1 | T-12 `create_comment` | 创建评论（支持 parent_id 嵌套回复），需登录，Markdown 渲染 | 工具就绪 |
| 4.2 | T-13 `delete_comment` | 软删除评论（作者本人或 admin），需确认 | 工具就绪 |
| 4.3 | T-14 `list_comments` | 文章评论列表（分页），支持嵌套结构组装 | 工具就绪 |
| 4.4 | T-15 `get_comment_count` | 文章评论总数（不含已删除） | 工具就绪 |
| 4.5 | T-16 `toggle_like` | 点赞/取消点赞，UNIQUE(article_id, user_id) 约束 | 工具就绪 |
| 4.6 | T-17 `get_like_status` | 当前用户对文章的点赞状态 | 工具就绪 |
| 4.7 | T-18 `get_like_count` | 文章点赞总数 | 工具就绪 |
| 4.8 | Article like_count 冗余更新 | 点赞/取消时同步更新 Article 表的 like_count 缓存字段 | 数据一致性 |

**Day 4 结束验证**：
```bash
curl -X POST /api/tools/comments -d '{"article_id":1,"content":"Great post!"}'  # → 201
curl /api/tools/comments?article_id=1  # → 200, 评论列表含嵌套结构
curl -X POST /api/tools/likes/1  # → 200, {"liked":true,"count":1}
curl -X POST /api/tools/likes/1  # → 200, {"liked":false,"count":0}
```

---

### Day 5 — 用户与认证工具（T-19 ~ T-24）

**目标**：完整的用户注册/登录/资料管理系统。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 5.1 | 密码工具 | `packages/backend/src/lib/password.ts`：bcryptjs 哈希 + 验证 | 密码安全 |
| 5.2 | T-19 `register` | 注册：校验 email 格式、密码强度（≥8位）、昵称必填，防重复邮箱 | 工具就绪 |
| 5.3 | T-20 `login` | 登录：验证凭据 → 创建 session → 设置 HttpOnly Cookie | 工具就绪 |
| 5.4 | T-21 `logout` | 登出：清除 session + Cookie | 工具就绪 |
| 5.5 | T-22 `get_profile` | 获取用户资料（自己或指定用户，公开信息对 guest 可见） | 工具就绪 |
| 5.6 | T-23 `update_profile` | 修改昵称/头像/简介 | 工具就绪 |
| 5.7 | T-24 `change_password` | 修改密码（需旧密码验证），确认卡片 | 工具就绪 |
| 5.8 | 安全加固 | 注册/登录速率限制（5次/分钟/IP），session 过期策略（7天） | 安全防护 |

**Day 5 结束验证**：
```bash
curl -X POST /api/tools/auth/register -d '{"email":"test@test.com","password":"12345678","nickname":"Tester"}'  # → 201
curl -X POST /api/tools/auth/login -d '{"email":"test@test.com","password":"12345678"}'  # → 200, Set-Cookie
curl /api/tools/users/profile  # → 200 (带 Cookie)
curl -X POST /api/tools/auth/logout  # → 200
```

---

## 第二周：AI Agent 层 + 管理工具（Day 6-10）

### Day 6 — AI SDK 集成 + System Prompt + 意图分类

**目标**：AI 模型能连通，System Prompt 就绪，意图分类工作正常。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 6.1 | AI 依赖安装 | `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai` | 依赖就绪 |
| 6.2 | AI Provider 配置 | `packages/backend/src/agent/providers.ts`：Anthropic（主）+ OpenAI（备），API Key 环境变量注入 | Provider 层 |
| 6.3 | System Prompt 模板 | `packages/backend/src/agent/system-prompt.ts`：按 REQUIREMENTS.md §4.2 实现 identity/capabilities/strict_rules/safety | System Prompt |
| 6.4 | 意图分类器 | `packages/backend/src/agent/intent-classifier.ts`：用 Haiku 将用户输入分类为 CRUD/Query/MultiStep/Unknown | 意图分类 |
| 6.5 | 分类 prompt 优化 | 分类 prompt + few-shot 示例，输出结构化 JSON `{intent, entities, confidence}` | 高准确率分类 |
| 6.6 | 工具 Schema 收集器 | `packages/backend/src/agent/tool-schemas.ts`：从 Tool Registry 收集所有工具的 JSON Schema，注入 AI 请求 | 工具描述生成 |
| 6.7 | 端到端验证 | 写一个测试脚本：发送自然语言 → Haiku 分类 → 返回意图类型 | AI 链路连通 |

**Day 6 结束验证**：
```typescript
// 测试脚本输出
"帮我发布一篇文章"       → { intent: "CRUD", action: "create", entity: "article" }
"最近有哪些 Rust 文章"  → { intent: "QUERY", entity: "article", filters: { tag: "Rust" } }
"今天网站数据怎么样"     → { intent: "QUERY", entity: "dashboard" }
```

---

### Day 7 — AI Agent 核心引擎（单步工具调用 + 流式响应）

**目标**：AI 能根据用户输入自动选择并调用工具，流式返回结果。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 7.1 | Agent 主控器 | `packages/backend/src/agent/controller.ts`：接收用户消息 → 意图分类 → 调用 AI SDK `generateText` + `tool()` → 返回结果 | Agent 核心 |
| 7.2 | 单步工具调用 | 使用 AI SDK 的 `tool()` 函数注册所有工具，`maxSteps: 1` | 单步调用 |
| 7.3 | 工具结果格式化器 | `packages/backend/src/agent/response-formatter.ts`：将工具返回的结构化数据转为自然语言 + 结果卡片 | 响应格式化 |
| 7.4 | 流式响应 | 使用 AI SDK 的 `streamText`，SSE 推送（typewriter effect） | 流式输出 |
| 7.5 | 错误处理 | 工具调用失败 → 重试 1 次 → 仍失败则友好提示 + 建议传统方式 | 容错 |
| 7.6 | 工具去重 | 相同参数的工具调用 30 秒内不重复执行 | 防重试风暴 |

**Day 7 结束验证**：
```
用户输入: "搜索关于 Docker 的文章"
AI 响应（流式）: "我找到了 3 篇 Docker 相关文章…" [文章卡片列表]
  - 内部: 意图分类 → list_articles(search="Docker") → 格式化响应
```

---

### Day 8 — AI Chat API + 确认卡片 + 会话管理

**目标**：完整的 `/api/chat` 端点系列，确认卡片协议实现。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 8.1 | `POST /api/chat` | JSON 模式：接收 `{message, session_id?}` → Agent 处理 → 返回 `{reply, cards[], confirmation?}` | API 就绪 |
| 8.2 | `POST /api/chat/stream` | SSE 流式模式：`text/event-stream`，逐步推送 token + 工具调用状态 | 流式 API |
| 8.3 | 确认卡片生成 | Agent 检测到 destroy/high-risk 操作 → 生成 confirmation_card JSON → 前端渲染 → 等待用户响应 | 确认协议 |
| 8.4 | `POST /api/chat/confirm` | 接收 `{confirm_id, action: confirm/cancel}` → 执行或丢弃待确认操作 | 确认 API |
| 8.5 | 会话创建与持久化 | `ChatSession` 表读写：创建会话、追加消息、读取历史 | 会话持久化 |
| 8.6 | `GET /api/chat/sessions` | 返回当前用户的会话列表 | 会话列表 |
| 8.7 | 上下文注入 | 当前页面 URL / 文章 ID / 用户角色 → 自动注入 System Prompt | 上下文感知 |

**Day 8 结束验证**：
```bash
# 流式对话
curl -N -X POST /api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我找 Rust 相关的文章"}'
# → SSE 事件流，逐步输出文字

# 确认卡片流程
curl -X POST /api/chat -d '{"message":"删除文章 ID=3"}'
# → { "confirmation": { "id": "confirm_xxx", "title": "确认删除", ... } }
curl -X POST /api/chat/confirm -d '{"confirm_id":"confirm_xxx","action":"confirm"}'
# → { "reply": "文章已删除" }
```

---

### Day 9 — 管理工具（T-25 ~ T-31）

**目标**：完整的管理后台工具链。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 9.1 | T-25 `get_dashboard_stats` | 仪表盘统计：文章数、用户数、评论数、访问量（today/week/month/all） | 工具就绪 |
| 9.2 | T-26 `list_users` | 用户列表（分页 + 按 status/role 筛选 + 搜索） | 工具就绪 |
| 9.3 | T-27 `update_user_status` | 启用/禁用用户，需确认 | 工具就绪 |
| 9.4 | T-28 `update_user_role` | 修改用户角色（user ↔ admin），需确认 | 工具就绪 |
| 9.5 | T-29 `batch_delete_comments` | 批量删除评论，需确认 | 工具就绪 |
| 9.6 | T-30 `get_site_config` | 获取站点设置（KV 对），支持按 key 筛选 | 工具就绪 |
| 9.7 | T-31 `update_site_config` | 更新站点设置，需确认 | 工具就绪 |
| 9.8 | 管理工具路由注册 | 所有管理工具注册到 `/api/tools/admin/*`，全部 require admin | 路由就绪 |

**Day 9 结束验证**：
```bash
curl /api/tools/admin/dashboard?range=today  # → 200, 统计数据
curl /api/tools/admin/users?status=disabled  # → 200, 用户列表
```

---

### Day 10 — AI 降级策略 + 全链路日志

**目标**：AI 不可用时自动降级，所有操作可追踪。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 10.1 | 降级检测器 | `packages/backend/src/agent/degradation.ts`：AI 连续失败计数器 + 健康检查探针 | 降级逻辑 |
| 10.2 | 降级 API | `GET /api/system/ai-status`：前端轮询 AI 状态 → `{available, mode, consecutive_failures}` | 状态 API |
| 10.3 | AIAuditLog 记录 | 每次 AI 请求写入：trace_id, user_intent, agent_plan, tool_calls, tokens_used, cost_estimate | 审计日志 |
| 10.4 | 日志中间件 | 请求级 trace_id 生成（uuid），注入 req 上下文，贯穿整个请求链路 | 链路追踪 |
| 10.5 | 错误日志结构化 | AI 调用失败/超时 → 结构化日志（含 trace_id, model, error_type, latency） | 错误追踪 |
| 10.6 | 工具调用计数器 | 简单的内存计数器：按工具统计调用次数和耗时，用于成本估算 | 调用统计 |

**Day 10 结束验证**：
```bash
# 模拟 AI 不可用
curl /api/system/ai-status  # → {"available":true,"mode":"ai","failures":0}
# 连续触发 3 次 AI 失败后
curl /api/system/ai-status  # → {"available":false,"mode":"degraded","failures":3}
```

---

## 第三周：前端（Day 11-15）

### Day 11 — Next.js 脚手架 + 布局 + 对话输入框

**目标**：前端项目能跑，基础布局就绪，对话输入框可交互。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 11.1 | Next.js 初始化 | `npx create-next-app@latest packages/frontend --typescript --tailwind --app` | 项目骨架 |
| 11.2 | Tailwind 配置 | 主题色、字体、响应式断点、暗色模式预留 | 样式基础 |
| 11.3 | 根布局 | `app/layout.tsx`：HTML 结构 + metadata + 字体加载 | 布局就绪 |
| 11.4 | AI 状态 Context | React Context：`AiContext` 管理 `{mode: 'ai'|'degraded', sessionId, messages[]}` | 状态管理 |
| 11.5 | 对话输入框组件 | `components/ChatInput.tsx`：多行文本输入 + 发送按钮 + 快捷键（Enter 发送，Shift+Enter 换行） | 输入框 |
| 11.6 | 消息列表组件 | `components/MessageList.tsx`：用户消息 + AI 回复气泡，Markdown 渲染 AI 回复内容 | 聊天 UI |
| 11.7 | SSE 流式接收 Hook | `hooks/useChatStream.ts`：连接 `/api/chat/stream`，逐步追加 token 到当前消息（typewriter 效果） | 流式接收 |
| 11.8 | 主页面 | `app/page.tsx`：整合输入框 + 消息列表的对话界面 | 主界面 |

**Day 11 结束验证**：
- `npm run dev` → 打开 `localhost:3000` → 看到对话界面
- 输入"你好" → 发送 → 收到 AI 流式回复
- 移动端响应式布局正常

---

### Day 12 — 确认卡片 + 工具结果卡片 + 传统导航栏

**目标**：对话体验完整（确认卡片、结果卡片），降级时导航栏自动出现。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 12.1 | 确认卡片组件 | `components/ConfirmationCard.tsx`：标题 + 摘要 + 预览 + 确认/取消按钮，5 分钟倒计时 | 确认卡片 |
| 12.2 | 文章卡片组件 | `components/ArticleCard.tsx`：标题 + 摘要 + 标签 + 日期 + 阅读量 | 文章卡片 |
| 12.3 | 评论卡片组件 | `components/CommentCard.tsx`：头像 + 昵称 + 时间 + 内容（嵌套回复缩进） | 评论卡片 |
| 12.4 | 数据卡片组件 | `components/StatCard.tsx`：统计数字 + 标签 + 趋势 | 统计卡片 |
| 12.5 | AI 降级检测 Hook | `hooks/useAiStatus.ts`：每 30 秒轮询 `/api/system/ai-status` | 状态检测 |
| 12.6 | 导航栏组件 | `components/Navbar.tsx`：仅在 `mode === 'degraded'` 时显示，含文章/标签/搜索/登录入口 | 降级导航 |
| 12.7 | 降级提示条 | `components/DegradationBanner.tsx`：顶部固定横幅"AI 助手暂时不可用…" | 降级提示 |

**Day 12 结束验证**：
- 输入"删除评论 5" → 弹出确认卡片 → 点击取消 → 不执行
- 输入"搜索 Rust" → 返回文章卡片列表
- 手动触发降级 → 导航栏自动出现 + 顶部横幅

---

### Day 13 — 传统页面（文章列表、详情、标签、搜索）

**目标**：AI 降级后用户可以正常浏览博客内容。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 13.1 | 文章列表页 | `app/articles/page.tsx`：分页卡片列表 + 标签筛选 + 排序切换（最新/热门） | 列表页 |
| 13.2 | 文章详情页 | `app/articles/[slug]/page.tsx`：标题 + 元信息 + 渲染正文 + 评论区 + 点赞按钮 | 详情页 |
| 13.3 | 文章目录组件 | `components/TableOfContents.tsx`：侧边栏固定，高亮当前位置 | TOC |
| 13.4 | 上一篇/下一篇导航 | `components/AdjacentNav.tsx`：文章底部上一篇/下一篇链接 | 文章导航 |
| 13.5 | 标签云页 | `app/tags/page.tsx`：所有标签 + 文章计数 | 标签页 |
| 13.6 | 标签筛选页 | `app/tags/[tag]/page.tsx`：按标签筛选的文章列表 | 标签筛选 |
| 13.7 | 搜索页 | `app/search/page.tsx`：搜索输入框 + 结果列表 | 搜索页 |
| 13.8 | Markdown 渲染组件 | `components/MarkdownRenderer.tsx`：复用后端的 unified 管线（或前端自行渲染） | Markdown 渲染 |

**Day 13 结束验证**：
- 访问 `/articles` → 看到文章列表
- 点击文章 → `/articles/some-slug` → 完整渲染 + TOC + 评论区
- 访问 `/tags` → 标签云
- 访问 `/search?q=Rust` → 搜索结果

---

### Day 14 — 认证页面 + 混合模式表单 + 用户中心

**目标**：注册/登录页面完成，混合模式表单与 AI 对话联动。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 14.1 | 登录页面 | `app/login/page.tsx`：邮箱 + 密码表单，POST 直达 `/api/tools/auth/login`（不经过 AI） | 登录页 |
| 14.2 | 注册页面 | `app/register/page.tsx`：邮箱 + 密码 + 昵称，POST 直达 `/api/tools/auth/register` | 注册页 |
| 14.3 | 混合模式表单组件 | `components/HybridForm.tsx`：AI 对话中嵌入的轻量登录/注册表单卡片 | 混合表单 |
| 14.4 | 用户状态 Hook | `hooks/useAuth.ts`：获取当前用户状态（登录/游客）、角色、资料 | 认证状态 |
| 14.5 | 个人中心页 | `app/user/profile/page.tsx`：资料展示 + 编辑表单 + 修改密码 | 个人中心 |
| 14.6 | 受保护路由 | 需要登录的页面：未登录自动跳转 `/login?redirect=xxx` | 路由保护 |
| 14.7 | 登录状态指示 | 导航栏/对话界面显示当前登录状态 + 退出按钮 | 状态指示 |

**Day 14 结束验证**：
- `/register` → 注册新用户 → 自动登录 → 跳转首页
- 对话界面显示"已登录：xxx"
- 输入"修改我的昵称" → AI 引导到资料编辑
- `/login` → 登录 → `/user/profile` → 编辑资料 → 保存

---

### Day 15 — 管理后台页面

**目标**：管理员可以可视化地管理网站。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 15.1 | 管理布局 | `app/admin/layout.tsx`：侧边栏导航 + admin 权限校验 | 管理布局 |
| 15.2 | 仪表盘页 | `app/admin/page.tsx`：统计卡片（文章/用户/评论/访问量） + 趋势图（可选简单图表） | 仪表盘 |
| 15.3 | 文章管理页 | `app/admin/articles/page.tsx`：文章列表 + 批量操作 + 创建/编辑入口 | 文章管理 |
| 15.4 | 文章编辑器 | `app/admin/articles/edit/page.tsx`：Markdown 编辑器（可用 textarea 起步，后续换 Monaco/CodeMirror） | 文章编辑 |
| 15.5 | 用户管理页 | `app/admin/users/page.tsx`：用户列表 + 启用/禁用 + 角色变更操作 | 用户管理 |
| 15.6 | 评论管理页 | `app/admin/comments/page.tsx`：评论列表 + 批量删除 | 评论管理 |
| 15.7 | 站点设置页 | `app/admin/settings/page.tsx`：站点名称/描述/Logo 等 KV 配置编辑 | 站点设置 |

**Day 15 结束验证**：
- `/admin` → 仪表盘正常显示
- 创建文章 → 编辑 → 发布 → 在文章列表可见
- 禁用用户 → 该用户无法登录
- 修改站点名称 → 前端标题更新

---

## 第四周：集成、测试、部署（Day 16-20）

### Day 16 — 集成测试 + Bug 修复

**目标**：端到端流程走通，阻塞性 Bug 清零。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 16.1 | 全流程走查 | 游客浏览 → 注册 → 登录 → AI 对话发布文章 → 传统页面查看 → 评论 → 点赞 → 管理后台审核 | 流程通过 |
| 16.2 | AI 对话测试 | 20+ 常见用户意图测试：发布文章、搜索、评论、点赞、查资料、管理操作、模糊意图 | 测试用例 |
| 16.3 | 降级流程测试 | 手动关闭 AI → 确认前端自动切换 → 传统页面正常工作 → 恢复 AI → 自动切回 | 降级通过 |
| 16.4 | 错误场景测试 | 无权限操作、重复提交、超大文件上传、SQL 注入尝试、XSS 尝试 | 错误处理 |
| 16.5 | Bug 修复 | 集中修复 16.1-16.4 发现的问题 | Bug 清零 |
| 16.6 | 响应式检查 | Desktop / Tablet / Mobile 三端 UI 走查 | 响应式通过 |

---

### Day 17 — 安全加固

**目标**：所有安全需求（NF-05~NF-10, NF-23~NF-26）验证通过。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 17.1 | 密码安全审计 | 确认 bcrypt 哈希正确使用，无明文密码日志 | 密码安全 |
| 17.2 | Session 安全 | HttpOnly + Secure + SameSite Cookie 配置确认 | Session 安全 |
| 17.3 | XSS 防护 | Markdown HTML 输出 sanitize（rehype-sanitize），AI 输出消毒 | XSS 防护 |
| 17.4 | CSRF 防护 | SameSite Cookie + CSRF Token（如需） | CSRF 防护 |
| 17.5 | 工具层鉴权审计 | 逐工具检查：权限装饰器正确、参数校验生效 | 鉴权审计 |
| 17.6 | Prompt Injection 防护 | 用户输入消毒：过滤"忽略之前的规则"等已知模式 | Prompt 安全 |
| 17.7 | 速率限制验证 | 登录/注册/Comment 工具速率限制生效确认 | 速率限制 |
| 17.8 | 文件上传安全 | 类型白名单 + 大小限制 + 恶意文件检测 | 上传安全 |

---

### Day 18 — Docker 部署配置

**目标**：`docker compose up` 一键启动完整环境。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 18.1 | Backend Dockerfile | 多阶段构建：build 阶段 → 生产阶段（node:20-alpine），仅复制必要文件 | Dockerfile |
| 18.2 | Frontend Dockerfile | Next.js standalone 模式构建 | Dockerfile |
| 18.3 | docker-compose.yml | 服务编排：backend (3001) + frontend (3000) + nginx (80/443)，volume 挂载数据库和上传文件 | Compose |
| 18.4 | nginx.conf | 反向代理：`/api/*` → backend，其余 → frontend，WebSocket 升级支持 SSE，Let's Encrypt 配置 | Nginx |
| 18.5 | 环境变量管理 | `.env.example` 模板（AI API Key、DB 路径、JWT Secret 等），docker-compose 中引用 | 环境配置 |
| 18.6 | 数据库持久化 | SQLite 文件挂载到 Docker volume，确保重建容器不丢数据 | 数据持久化 |
| 18.7 | 启动脚本 | `scripts/start.sh`：docker compose up -d，等待健康检查通过 | 启动脚本 |
| 18.8 | Let's Encrypt 配置 | certbot + nginx 自动续签配置 | HTTPS |

**Day 18 结束验证**：
```bash
docker compose up -d
curl https://your-domain.com/api/health  # → {"status":"ok"}
curl https://your-domain.com  # → Next.js 首页
```

---

### Day 19 — 端到端测试 + 性能验证

**目标**：写自动化测试，性能指标达标。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 19.1 | Vitest 配置 | 安装 vitest，backend 和 frontend 测试配置 | 测试框架 |
| 19.2 | 工具单元测试 | 每个工具的 handler 函数测试（mock DB），覆盖正常/异常/权限/边界 | 工具测试 |
| 19.3 | Tool Registry 测试 | 注册、查找、Schema 导出测试 | Registry 测试 |
| 19.4 | Auth 中间件测试 | 各种权限场景的中间件行为测试 | Auth 测试 |
| 19.5 | AI Agent 测试 | Mock AI SDK 响应，测试意图分类路由 + 工具选择逻辑 | Agent 测试 |
| 19.6 | 前端组件测试 | ChatInput, ConfirmationCard, ArticleCard 等核心组件的渲染测试 | 组件测试 |
| 19.7 | 性能验证 | 首屏加载 < 2s，Markdown 渲染 < 500ms，AI 首 token < 2s | 性能达标 |

**Day 19 结束验证**：
```bash
npm test  # → 所有测试通过
# 性能指标 checklist 全部打勾
```

---

### Day 20 — 文档 + 最终检查 + 上线

**目标**：文档完善，代码干净，准备合并 main。

| # | 任务 | 详细内容 | 产出 |
|---|------|---------|------|
| 20.1 | API 文档 | 基于 Tool Registry 自动生成的 API 参考（或手写 README） | API 文档 |
| 20.2 | 部署文档 | 服务器部署步骤（从零到上线）：环境准备 → 克隆代码 → 配置环境变量 → Docker 启动 → HTTPS | 部署指南 |
| 20.3 | README.md | 项目介绍 + 快速开始 + 架构图 + 技术栈 + 链接 | README |
| 20.4 | 代码清理 | 删除调试代码、console.log、注释掉的代码、未使用的 import | 代码整洁 |
| 20.5 | 最终 PR | 创建 feature/phase1-mvp → main 的 PR，完整 PR 描述 | PR |
| 20.6 | 合并 + 部署 | Squash merge → main，服务器拉取 → docker compose up -d | 上线 |

---

## 任务依赖关系图

```
Day 1 (脚手架+DB)
  └─→ Day 2 (Tool Registry+Auth)
       └─→ Day 3 (文章工具 T-01~11)
            ├─→ Day 4 (评论+点赞 T-12~18)
            │    └─→ Day 5 (用户认证 T-19~24)
            │         └─→ Day 9 (管理工具 T-25~31)
            └─→ Day 6 (AI SDK+意图分类)
                 └─→ Day 7 (Agent 核心引擎)
                      └─→ Day 8 (Chat API+确认卡片)
                           └─→ Day 10 (降级+日志)
                                └─→ Day 16 (集成测试)
      
Day 11 (前端脚手架)
  └─→ Day 12 (确认卡片+导航)
       └─→ Day 13 (传统页面)
            └─→ Day 14 (认证页面)
                 └─→ Day 15 (管理后台)
                      └─→ Day 16 (集成测试)

Day 16 (集成测试)
  └─→ Day 17 (安全加固)
       └─→ Day 18 (Docker)
            └─→ Day 19 (自动化测试+性能)
                 └─→ Day 20 (文档+上线)
```

## 关键风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| AI SDK 版本不兼容 | 中 | Day 6 第一时间验证 AI SDK 连通性，锁定版本 |
| 前端 SSE 流式接收复杂度过高 | 中 | Day 11 先做非流式 JSON 模式保底，流式作为增强 |
| 中文 Markdown 渲染问题 | 低 | Day 3 就用真实中文内容测试 unified 管线 |
| Docker 网络配置问题 | 中 | Day 18 预留充足时间，docker-compose 网络调试可能耗时 |
| 个人开发时间不稳定 | 高 | 每天有明确的"最小可交付"目标，未完成的任务顺延而非加班 |

## 每日提交规范

每天结束时至少一次提交：
```bash
git add -A
git commit -m "feat: Day N — 简短描述

详细内容（可选）

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

---

> 这份计划是一个路线图，不是军令状。实际开发中根据进展灵活调整，但保持"每一天都有可运行产出"的原则不变。
