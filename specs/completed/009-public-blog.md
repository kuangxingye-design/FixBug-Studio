# Spec: 公开博客前端

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

定义博客公开访问端的所有页面和功能。包括首页（精选文章）、文章列表（分页/筛选/排序）、文章详情（Markdown 渲染 + TOC 侧边栏）、分类/标签浏览、归档页、全文搜索、RSS Feed、Sitemap、以及深色模式支持。所有公开页面使用统一的 Header + Footer 布局，采用响应式设计。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] 首页：精选文章展示 + 最新文章列表
  - [x] 文章列表页：分页、按分类/标签筛选、排序（最新/最旧）、关键词搜索
  - [x] 文章详情页：Markdown 渲染 + 目录（TOC）侧边栏 + 评论区
  - [x] 分类页：所有分类列表 + 按分类浏览文章
  - [x] 标签页：所有标签列表（标签云）+ 按标签浏览文章
  - [x] 搜索功能：全文搜索（SQLite FTS5）
  - [x] RSS Feed（`/rss.xml`）
  - [x] Sitemap（`/sitemap.xml`）
  - [x] 深色模式（next-themes）
  - [x] 响应式布局

- **P1**
  - [x] 归档页：按年份/月份分组
  - [x] 关于页面
  - [x] 阅读时间展示
  - [x] 文章浏览量计数

- **P2**
  - [ ] 相关文章推荐
  - [ ] 上一篇/下一篇导航

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持用户注册/登录（公开端纯只读 + 评论）
- ❌ 不支持 Newsletter 订阅
- ❌ 不支持文章分享按钮（社交分享）
- ❌ 不支持文章导出（PDF、ePub）

---

## 4. 设计方案 (Design)

### 4.1 路由架构

```
src/app/(public)/                  # 公开路由组（共享 Header + Footer 布局）
├── layout.tsx                     # 公共布局：Header + main + Footer
├── page.tsx                       # 首页
├── error.tsx                      # 错误边界
├── not-found.tsx                  # 自定义 404
├── articles/
│   ├── page.tsx                   # 文章列表（分页 + 筛选）
│   └── [slug]/page.tsx            # 文章详情
├── categories/
│   ├── page.tsx                   # 所有分类
│   └── [slug]/page.tsx            # 分类下的文章
├── tags/
│   ├── page.tsx                   # 所有标签（标签云）
│   └── [slug]/page.tsx            # 标签下的文章
├── search/page.tsx                # 搜索结果页
├── archive/page.tsx               # 文章归档（按年月）
└── about/page.tsx                 # 关于页面

src/app/
├── rss.xml/route.ts               # RSS 2.0 Feed
└── sitemap.xml/route.ts           # Sitemap XML
```

### 4.2 组件设计

```
src/components/
├── layout/
│   ├── Header.tsx        # 导航栏（Logo + 导航链接 + 搜索 + ThemeToggle）
│   ├── Footer.tsx        # 页脚（版权信息 + 社交链接）
│   └── ThemeToggle.tsx   # 深色/浅色模式切换按钮
├── articles/
│   ├── ArticleCard.tsx   # 文章卡片（标题、摘要、分类、标签、日期、阅读时间）
│   └── TableOfContents.tsx # 文章目录侧边栏
├── comments/
│   ├── CommentSection.tsx
│   ├── CommentList.tsx
│   ├── CommentItem.tsx
│   └── CommentForm.tsx
└── shared/
    ├── MarkdownRenderer.tsx  # Markdown → React 组件渲染
    └── Pagination.tsx        # 通用分页组件
```

### 4.3 Markdown 渲染方案

```typescript
// 使用 react-markdown 生态
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";           // GitHub Flavored Markdown
import rehypeHighlight from "rehype-highlight"; // 代码语法高亮
import rehypeSlug from "rehype-slug";         // 标题自动生成 id（用于 TOC 锚点）
```

### 4.4 TOC 提取算法

```typescript
// src/lib/markdown/toc.ts
interface TOCItem {
  id: string;           // 标题的 anchor id
  text: string;         // 标题文本
  level: number;        // 标题级别 (2-4)
  children: TOCItem[];  // 子标题
}

// 算法：
// 1. 用正则 /^(#{2,4})\s+(.+)$/gm 匹配 h2-h4 标题
// 2. 用 stack 维护层级关系（类似括号匹配）
// 3. 标题文本 → anchor id：小写 + 去特殊字符 + 空格转连字符
```

### 4.5 全文搜索（FTS5）

```typescript
// src/lib/search/index.ts
// 使用 SQLite FTS5 虚拟表 articles_fts
// 查询：SELECT rowid, rank FROM articles_fts WHERE articles_fts MATCH ?
// 支持中英文混合搜索
// 参数清洗：去除特殊字符，防止 FTS5 语法错误
const sanitizedQuery = query.replace(/[^\w\s一-鿿]/g, "").trim();
```

**FTS5 索引内容：** title, content, excerpt

### 4.6 RSS Feed

```xml
<!-- /rss.xml -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>站点名称</title>
    <link>站点 URL</link>
    <description>站点描述</description>
    <language>zh-CN</language>
    <atom:link href="{baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>文章标题</title>
      <link>{baseUrl}/articles/{slug}</link>
      <guid>{baseUrl}/articles/{slug}</guid>
      <description>文章摘要或前 300 字符纯文本</description>
      <pubDate>发布时间 (RFC 822)</pubDate>
    </item>
    <!-- 最多 20 篇最新已发布文章 -->
  </channel>
</rss>
```

**要点：**
- 只包含 `status = "published"` 的文章
- 最多 20 篇，按发布时间倒序
- 使用站点设置中的 `site_name` 和 `site_description`
- XML 特殊字符转义（`&`, `<`, `>`, `"`, `'`）

### 4.7 Sitemap

```xml
<!-- /sitemap.xml -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{baseUrl}/articles/{slug}</loc>
    <lastmod>{updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ...
</urlset>
```

### 4.8 深色模式

```
next-themes 方案：
- ThemeProvider 包裹根布局
- darkMode: "class"（Tailwind 的 dark: 变体基于 class 切换）
- CSS 变量在 :root 和 .dark 下定义两套颜色
- ThemeToggle 按钮切换 theme
- 默认跟随系统偏好（respects prefers-color-scheme）
```

### 4.9 API 设计（公开端）

```
GET /api/articles?page=1&limit=10&category=tech&sort=latest&search=keyword
  → { articles: [...], pagination: {...} }

GET /api/articles/[slug]
  → { article: {...} }   # 包含 tags, category

GET /api/articles/featured
  → { articles: [...] }  # isFeatured = true + published

GET /api/articles/[slug]/comments
  → { comments: [...] }  # 嵌套结构，仅 approved

GET /api/categories
  → { categories: [...] } # 含 articleCount

GET /api/tags
  → { tags: [...] }       # 含 articleCount

GET /api/search?q=keyword&page=1&limit=10
  → { articles: [...], pagination: {...} }  # FTS5 全文搜索

GET /api/settings/public
  → { settings: {...} }   # 站点配置
```

---

## 5. 用户流程 (User Flows)

### 访客浏览首页

1. 访问 `/` → 看到精选文章区 + 最新文章列表
2. 点击文章卡片 → 进入文章详情页

### 访客搜索

1. 在 Header 搜索框输入关键词 → 回车或点击搜索
2. 跳转 `/search?q=keyword`
3. 查看 FTS5 全文搜索结果（支持中英文）
4. 分页浏览结果

### 访客按分类浏览

1. 点击文章卡片上的分类名 → `/categories/[slug]`
2. 查看该分类下所有已发布文章

### 访客查看归档

1. 访问 `/archive` → 按年份/月份分组的文章列表
2. 点击文章标题 → 进入详情页

### RSS 订阅

1. 阅读器添加 `/rss.xml` → 自动拉取最新文章

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 文章不存在（slug 无效） | notFound() → 自定义 404 页面 |
| 分类/标签无文章 | 显示 "该分类/标签下暂无文章" 空状态 |
| 搜索结果为空 | 显示 "未找到相关文章" 空状态 |
| FTS5 搜索特殊字符 | `sanitizedQuery` 清洗 → 仅保留字母、数字、中文 |
| 空搜索词 | 返回空结果，不执行 FTS5 查询 |
| 文章内容为空 | MarkdownRenderer 渲染空白，无报错 |
| TOC 无标题（文章无 h2-h4） | TableOfContents 组件不渲染 |
| RSS 无文章 | 返回空 channel |
| 深色模式下第三方组件样式异常 | 使用 CSS 变量 + Tailwind dark: 覆盖 |

---

## 7. 性能考量 (Performance)

- [x] **React Server Components：** 文章列表、详情等页面使用 RSC，减少客户端 JS
- [x] **FTS5 全文搜索：** SQLite 原生全文索引，比 LIKE 查询快 10-100 倍
- [x] **标签/分类带计数：** 使用 SQL `GROUP BY + COUNT`，一次查询返回全部数据
- [x] **RSS 限制 20 篇：** 避免 Feed 过大
- [x] **Sitemap：** 动态生成，无缓存（适合中小型博客）
- [ ] 未实现：文章列表缓存（ISR — Incremental Static Regeneration）
- [ ] 未实现：图片懒加载

---

## 8. 可访问性 (Accessibility)

- [x] 语义化 HTML：`<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`
- [x] 标题层级：h1（文章标题）→ h2（段落标题）→ h3（子标题）
- [x] TOC 使用 `<nav>` + `<ol>` 语义标记
- [x] 图片支持 alt 属性
- [x] 深色模式支持（减少眼部疲劳）
- [x] 链接有下划线或颜色区分（非仅颜色区分）
- [x] 分页组件使用 `<nav aria-label="Pagination">`

---

## 9. 实现计划 (Implementation Plan)

### Step 1: 公共 API 端点

- `src/app/api/articles/route.ts` — 列表（分页/筛选/排序）
- `src/app/api/articles/[slug]/route.ts` — 详情
- `src/app/api/articles/featured/route.ts` — 精选
- `src/app/api/categories/route.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/search/route.ts` — FTS5 搜索
- `src/app/api/settings/public/route.ts`

### Step 2: 公共页面

- `src/app/(public)/layout.tsx` — 公共布局
- `src/app/(public)/page.tsx` — 首页
- `src/app/(public)/articles/page.tsx` — 文章列表
- `src/app/(public)/articles/[slug]/page.tsx` — 文章详情
- `src/app/(public)/categories/page.tsx` + `[slug]/page.tsx`
- `src/app/(public)/tags/page.tsx` + `[slug]/page.tsx`
- `src/app/(public)/search/page.tsx`
- `src/app/(public)/archive/page.tsx`
- `src/app/(public)/about/page.tsx`

### Step 3: RSS + Sitemap

- `src/app/rss.xml/route.ts`
- `src/app/sitemap.xml/route.ts`
- `src/lib/rss/generate.ts`
- `src/lib/search/index.ts` — FTS5 搜索模块

### Step 4: 组件

- `src/components/layout/Header.tsx`, `Footer.tsx`, `ThemeToggle.tsx`
- `src/components/articles/ArticleCard.tsx`, `TableOfContents.tsx`
- `src/components/shared/MarkdownRenderer.tsx`, `Pagination.tsx`
- `src/components/comments/*`
- `src/providers/ThemeProvider.tsx`

### Step 5: Markdown 工具

- `src/lib/markdown/render.ts` — extractPlainText, stripMarkdown
- `src/lib/markdown/toc.ts` — extractTOC

---

## 10. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | extractTOC 层级正确性；extractPlainText 各类 Markdown 语法去除；FTS5 sanitizeQuery 特殊字符处理；RSS XML 转义 |
| 集成测试 | 文章列表分页/筛选/排序；文章详情返回 tags + category；FTS5 搜索结果准确性 |
| E2E 测试 | 首页加载 → 点击文章 → 阅读详情 → 发表评论；搜索流程：输入关键词 → 查看结果；RSS Feed XML 格式正确性 |
| 手动测试 | 深色模式切换；移动端响应式布局；TOC 点击锚点跳转 |

---

## 11. Checklist

### Pre-Implementation

- [x] 确定 Markdown 渲染方案：react-markdown + remark-gfm + rehype-highlight + rehype-slug
- [x] 确定搜索方案：SQLite FTS5
- [x] 确定深色模式方案：next-themes + Tailwind dark:
- [x] 确定 TOC 提取：h2-h4，stack 算法构建层级
- [x] 确定 RSS 标准：RSS 2.0

### Post-Implementation

- [x] 所有公开页面可访问且无报错
- [x] FTS5 搜索可用（中英文）
- [x] RSS Feed XML 格式正确
- [x] Sitemap XML 格式正确
- [x] 深色模式正常工作
- [x] 响应式布局在手机/平板/桌面端正常
- [x] 404 页面自定义
- [x] 空状态在无文章/无结果时正确展示
