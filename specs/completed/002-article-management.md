# Spec: 文章管理系统

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

提供完整的文章生命周期管理：创建、编辑、删除、发布、归档。支持草稿/已发布/已归档三种状态流转，Markdown 编辑器 + 实时预览，标签和分类关联，版本历史自动快照。管理后台 API 全部需要管理员鉴权。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] 文章 CRUD（创建/读取/更新/删除）
  - [x] 文章状态管理：draft → published → archived 三态流转
  - [x] 文章关联分类（多对一）和标签（多对多）
  - [x] 自动 slug 生成（基于标题，支持手动覆盖）
  - [x] 自动计算阅读时间
  - [x] 内容变更时自动创建版本快照

- **P1**
  - [x] 文章列表支持筛选（按状态/分类/标签/关键词）
  - [x] 分页查询
  - [x] 精选文章标记（isFeatured）
  - [x] 封面图支持

- **P2**
  - [x] 文章版本历史查看
  - [x] AI 处理元数据存储（`aiMetadata` JSON 字段）

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持文章定时发布（publishedAt 字段存在但无调度器）
- ❌ 不支持文章模板
- ❌ 不支持批量操作
- ❌ 版本回滚功能（版本只做快照，不提供一键恢复 UI）
- ❌ 文章协作编辑

---

## 4. 设计方案 (Design)

### 4.1 状态机

```
  ┌────────┐    publish    ┌───────────┐    archive    ┌──────────┐
  │ draft  │ ────────────▶ │ published │ ────────────▶ │ archived │
  └────────┘               └───────────┘               └──────────┘
       ▲                         │                          │
       │      unpublish          │                          │
       └─────────────────────────┘                          │
       │       republish         │       republish          │
       └─────────────────────────┴──────────────────────────┘
```

- `draft` → `published`：首次发布，自动设置 `publishedAt` 为当前时间
- `published` → `draft`：取消发布（如发现错误需要修改）
- `published` → `archived`：归档（文章过时但保留访问）
- `draft` / `archived` → `published`：重新发布（保持原始 `publishedAt`）

### 4.2 数据模型

```sql
CREATE TABLE articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  excerpt       TEXT,                              -- 摘要，≤500字符
  content       TEXT NOT NULL,                      -- 正文（Markdown）
  raw_content   TEXT,                               -- AI 处理的原始输入
  cover_image   TEXT,                               -- 封面图 URL
  status        TEXT NOT NULL DEFAULT 'draft',     -- draft | published | archived
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  reading_time  INTEGER,                            -- 分钟
  is_featured   INTEGER DEFAULT 0,                  -- boolean
  view_count    INTEGER DEFAULT 0,
  ai_metadata   TEXT,                               -- JSON 字段
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 文章-标签关联表（多对多）
CREATE TABLE article_tags (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 版本历史
CREATE TABLE article_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,           -- 该版本的完整正文
  excerpt     TEXT,
  version     INTEGER NOT NULL,        -- 递增版本号
  change_note TEXT,                    -- 变更说明
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
```

### 4.3 API 设计

#### Admin API — 文章列表

```
GET /api/admin/articles?page=1&limit=10&status=published&category=tech&search=react
```

**Response 200:**
```typescript
{
  articles: Array<{
    id, title, slug, excerpt, status,
    categoryId, categoryName,
    readingTime, isFeatured, viewCount,
    publishedAt, createdAt, updatedAt,
    tags: [{ id, name, slug }]
  }>,
  pagination: { page, limit, total, totalPages }
}
```

#### Admin API — 创建文章

```
POST /api/admin/articles
```

```typescript
// Request Body
{
  title: string,          // 必填，≤200
  slug?: string,          // 可选，不填自动生成
  excerpt?: string,       // ≤500
  content: string,        // 必填，Markdown
  rawContent?: string,    // AI 原始输入
  coverImage?: string,
  status?: "draft" | "published" | "archived",  // 默认 draft
  categoryId?: number | null,
  tagIds?: number[],
  isFeatured?: boolean,
  aiMetadata?: any
}

// Response 201
{ article: { ... } }
```

#### Admin API — 获取/更新/删除单篇文章

```
GET    /api/admin/articles/[id]    → 文章详情 + tags + versions
PUT    /api/admin/articles/[id]    → 更新文章（内容变更时自动创建版本快照）
DELETE /api/admin/articles/[id]    → 删除文章（CASCADE 删除 tags 关联和 versions）
```

**PUT 更新逻辑要点：**
1. 比较新旧 `content`，如有变化 → 查询当前最大版本号 → 插入一条 `article_versions` 记录
2. 标题变更且未提供新 slug → 自动基于新标题生成 slug
3. 状态变为 `published` 且之前未发布过 → 设置 `publishedAt`
4. 标签关联更新：先 `DELETE` 旧关联，再 `INSERT` 新关联

#### Admin API — 发布/归档快捷操作

```
POST /api/admin/articles/[id]/publish   → 设置 status = "published"
POST /api/admin/articles/[id]/archive   → 设置 status = "archived"
```

### 4.4 组件设计

```
src/components/admin/
├── DataTable.tsx         # 通用表格组件（用于文章列表）
├── TagSelector.tsx       # 标签选择器（多选下拉）
├── CategorySelector.tsx  # 分类选择器（单选下拉）
├── VersionHistory.tsx    # 版本历史列表
├── AIPreviewPanel.tsx    # AI 处理预览面板（文章创建流程复用）
└── UploadZone.tsx        # 文件上传区域（封面图）
```

### 4.5 Zod 校验

```typescript
// src/lib/utils/validators.ts

const createArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  rawContent: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  categoryId: z.number().int().positive().optional().nullable(),
  tagIds: z.array(z.number().int().positive()).optional(),
  isFeatured: z.boolean().optional(),
  aiMetadata: z.any().optional(),
});

const updateArticleSchema = createArticleSchema.partial();
// 所有字段可选，只更新传入的字段
```

---

## 5. 用户流程 (User Flows)

### 创建文章（手动编写）

1. 管理员进入 `/admin/articles/new`
2. 填写标题 → 自动生成 slug（可手动修改）
3. 在 Markdown 编辑器中编写正文，右侧实时预览
4. 选择分类（可选）和标签（可选）
5. 设置状态：保存草稿 / 直接发布
6. 提交 → `POST /api/admin/articles` → 跳转文章列表

### 创建文章（AI 辅助）

1. 管理员在 AI 面板上传 .md 文件
2. AI 处理完成后自动填充：标题、正文、摘要、分类建议、标签建议、阅读时间
3. 管理员审核修改 → 确认发布

### 编辑文章

1. 在文章列表点击"编辑" → `/admin/articles/[id]/edit`
2. 修改内容 → 提交 PUT → 系统自动创建版本快照
3. 可查看版本历史列表

### 文章列表筛选

1. 在文章列表页按状态下拉筛选：全部 / 草稿 / 已发布 / 已归档
2. 搜索框输入关键词（模糊匹配标题和正文）
3. 分页浏览

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 创建文章时 slug 重复 | 数据库 UNIQUE 约束报错 → 500 "Failed to create article"，前端可提示修改 slug |
| 文章 ID 不存在 | 404 "Article not found" |
| ID 格式非法（非数字） | 400 "Invalid article ID" |
| 更新文章时未修改任何字段 | PUT 正常执行，无版本快照生成（content 未变） |
| 删除文章时存在关联评论 | CASCADE 自动删除所有关联评论和版本历史 |
| 删除文章时存在关联标签 | CASCADE 自动删除 article_tags 关联 |
| 同一标题生成相同 slug | slugify 函数生成 `"my-title"`，需手动改为 `"my-title-2"`（当前未处理，交由 UNIQUE 约束报错） |
| 空内容文章 | Zod 校验拦截：`content: z.string().min(1)` |

---

## 7. 安全考量 (Security)

- [x] 所有 Admin API 端点均调用 `getCurrentUser()` 进行 JWT 鉴权
- [x] `content` 和 `excerpt` 不做输入过滤（存储原始 Markdown，渲染时由 MarkdownRenderer 安全处理）
- [x] `tagIds` 校验为 `z.number().int().positive()`，防止任意数据注入关联表
- [x] Zod 校验所有输入字段类型和长度限制

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 数据模型 + 校验 Schema

- `src/lib/db/schema.ts` — articles, articleTags, articleVersions 表定义
- `src/lib/utils/validators.ts` — createArticleSchema, updateArticleSchema
- `src/lib/utils/slugify.ts` — slugify()
- `src/lib/utils/reading-time.ts` — calculateReadingTime()

### Step 2: Admin API 端点

- `src/app/api/admin/articles/route.ts` — GET（列表）+ POST（创建）
- `src/app/api/admin/articles/[id]/route.ts` — GET + PUT + DELETE
- `src/app/api/admin/articles/[id]/publish/route.ts`
- `src/app/api/admin/articles/[id]/archive/route.ts`

### Step 3: 管理后台页面

- `src/app/admin/articles/page.tsx` — 文章列表（DataTable）
- `src/app/admin/articles/new/page.tsx` — 新建文章（Markdown 编辑器 + 预览）
- `src/app/admin/articles/[id]/edit/page.tsx` — 编辑文章（含版本历史）

### Step 4: 组件

- `src/components/admin/DataTable.tsx`
- `src/components/admin/TagSelector.tsx`
- `src/components/admin/CategorySelector.tsx`
- `src/components/admin/VersionHistory.tsx`

---

## 9. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | slugify 边界情况（中英文、特殊字符、空字符串）；calculateReadingTime 计算精度；Zod 校验规则 |
| 集成测试 | 文章 CRUD 全生命周期：创建 → 发布 → 编辑（触发版本快照）→ 归档 → 删除；标签关联增删；分页和筛选 |
| 手动测试 | Markdown 编辑器 + 预览面板；版本历史列表正确性；slug 重复时的错误提示 |

---

## 10. Checklist

### Pre-Implementation

- [x] 确定文章状态枚举：draft / published / archived
- [x] 确定版本快照策略：仅 content 变更时创建
- [x] 确定 slug 生成策略：基于标题 + 支持手动覆盖
- [x] 确定标签关联更新方式：先删后插

### Post-Implementation

- [x] 文章 CRUD 完整流程跑通
- [x] 版本历史自动创建
- [x] 标签和分类关联正确
- [x] 分页和筛选功能正常
- [x] 发布/归档快捷操作生效
