# FixBug Studio

AI 辅助的个人博客 / 知识库系统。上传原始 Markdown 笔记，AI 帮你整理成结构化文章，并提供完整的管理后台、评论审核、分类标签、全文搜索、RSS 与站点地图。

## 功能特性

- **AI 文档处理**：上传 `.md` 文件，AI 自动整理结构、生成标题 / 摘要 / 标签 / 分类建议，支持 SSE 流式进度和前后对比预览。
- **文章管理**：Markdown 编辑器、草稿 / 发布 / 归档状态、版本历史快照、封面图、精选文章。
- **管理后台**：文章、分类、标签、评论审核、媒体库、个人资料、站点设置。
- **公开博客**：首页、文章列表与详情、分类 / 标签浏览、归档、全文搜索、关于页。
- **评论系统**：游客评论、管理员审核、父子回复。
- **站点能力**：RSS (`/rss.xml`)、站点地图 (`/sitemap.xml`)、深色模式、响应式布局、中英文界面。
- **媒体上传**：图片上传到本地 `data/uploads/`，由 `/uploads/images/[filename]` 路由统一提供，开发与生产行为一致。

## 技术栈

- **框架**：Next.js 15（App Router）+ TypeScript
- **数据库**：SQLite（`better-sqlite3`）+ Drizzle ORM
- **样式**：Tailwind CSS 3 + `@tailwindcss/typography`
- **AI**：Anthropic SDK（默认接入 DeepSeek 的 Anthropic 兼容接口，也可直连 Anthropic）
- **认证**：自研 JWT + httpOnly Cookie 会话
- **搜索**：SQLite FTS5 全文索引

## 快速开始

### 环境要求

- Node.js ≥ 18.18（Next.js 15 要求），建议使用 LTS 版本
- npm

### 安装与启动

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

打开 <http://localhost:3000> 查看博客首页，访问 `/admin/login` 进入管理后台。

种子脚本创建的默认管理员：

- 邮箱：`admin@blog.local`
- 密码：`admin123`

> 首次部署后请立即登录后台修改密码，并替换 `.env.local` 中的 `SESSION_SECRET`。

### 配置 AI

编辑 `.env.local`：

```bash
# DeepSeek（默认，Anthropic 兼容协议）
ANTHROPIC_API_KEY=your-deepseek-api-key
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
# AI_MODEL=deepseek-v4-pro
```

切换到 Anthropic 官方接口时，注释掉 `ANTHROPIC_BASE_URL`，将 `ANTHROPIC_API_KEY` 换成 Anthropic Key，并设置 `AI_MODEL`（如 `claude-sonnet-5`）。

未配置 API Key 时，AI 处理会降级为原始 Markdown 直出，基础博客功能仍可正常使用。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行生产构建 |
| `npm run lint` | 运行 ESLint |
| `npm run db:generate` | 生成 Drizzle 迁移 |
| `npm run db:migrate` | 执行迁移并建立 FTS5 全文索引 |
| `npm run db:seed` | 写入示例管理员、分类、标签与文章 |
| `npm run db:studio` | 打开 Drizzle Studio |

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 否 | AI 服务 API Key，缺省时 AI 功能降级 |
| `ANTHROPIC_BASE_URL` | 否 | Anthropic 兼容接口地址，缺省为 Anthropic 官方 |
| `AI_MODEL` | 否 | 模型名，缺省为 `deepseek-v4-pro` |
| `SESSION_SECRET` | 是 | 会话签名密钥，可用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_APP_URL` | 否 | 站点公开地址，用于 RSS / Sitemap |
| `DATABASE_URL` | 否 | SQLite 路径，缺省为 `./data/blog.db` |

## 项目结构

```text
src/
├── app/
│   ├── (public)/       # 公开博客页面
│   ├── admin/          # 管理后台
│   ├── api/            # API Route Handlers
│   ├── uploads/        # 上传文件路由
│   ├── rss.xml/        # RSS
│   └── sitemap.xml/    # 站点地图
├── components/         # UI / 布局 / 文章 / 评论 / 管理组件
├── hooks/              # 自定义 Hooks
├── i18n/               # 中英文文案与语言切换
├── lib/
│   ├── ai/             # AI 客户端、提示词、处理 / 合并逻辑
│   ├── auth/           # 会话与密码哈希
│   ├── db/             # 数据库连接、Schema、迁移与种子
│   ├── markdown/       # Markdown 渲染、TOC、图片重写
│   ├── media/          # 上传文件存储与安全路径解析
│   ├── rss/            # RSS 生成
│   ├── search/         # FTS5 全文搜索
│   └── utils/          # slugify、日期、阅读时长、校验
├── middleware.ts       # 管理后台登录保护与语言检测
├── providers/          # 主题 Provider
└── types/              # 共享类型
```

## 数据与安全

- 数据库文件位于 `data/blog.db`，已加入 `.gitignore`，不会进入版本库。
- 上传的媒体文件写入 `data/uploads/images/`，并通过 `resolveMediaPath` 校验文件名，拒绝路径穿越。
- `.env.local` 已被忽略；仓库只提交 `.env.example` 模板。
- AI 处理需要调用外部模型接口，上传的 Markdown 内容会发送给所配置的 AI 服务。
- 管理后台由 `src/middleware.ts` 做会话保护；API 路由会再次校验会话。

## 生产部署

```bash
npm run build
npm run start
```

项目已附带 PM2 配置 `ecosystem.config.js`，安装 PM2 后可用：

```bash
pm2 start ecosystem.config.js
pm2 save
```

## 文档索引

- `CLAUDE.md`：面向 AI 协作助手的项目说明
- `DEVELOPMENT-PLAN.md`：开发计划
- `REQUIREMENTS.md`：需求规格说明书
- `specs/`：功能规格文档

## 已知限制

- SQLite 为单文件数据库，适合个人 / 单机部署；多实例部署需要替换为 PostgreSQL 等并调整 Drizzle 配置。
- `npm run build` 可以通过，但当前存在若干 ESLint 警告（未使用变量、`<img>` 标签、Hook 依赖等）。
- 根应用是单应用 Next.js 结构；`packages/frontend/` 是独立的 `create-next-app` 脚手架，与根应用无直接关联。
