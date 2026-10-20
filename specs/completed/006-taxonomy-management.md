# Spec: 分类与标签管理

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

为博客提供分类（Category）和标签（Tag）两种内容组织方式。分类是层级化的单归属（一篇文章属于一个分类），标签是扁平化的多归属（一篇文章可有多个标签）。管理后台支持 CRUD 操作，公开 API 返回带文章计数的列表。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] 分类 CRUD（名称、slug、描述、颜色、排序）
  - [x] 标签 CRUD（名称、slug）
  - [x] 自动 slug 生成（基于名称）

- **P1**
  - [x] 公开 API 返回分类/标签列表（含文章计数）
  - [x] 分类支持排序（sortOrder）
  - [x] 分类支持颜色标记（前端展示用）

- **P2**
  - [ ] 分类层级（父子分类）

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持分类嵌套/层级
- ❌ 标签不支持颜色和排序

---

## 4. 设计方案 (Design)

### 4.1 数据模型

```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT,              -- 如 "#3B82F6"，前端标签颜色
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
```

### 4.2 API 设计

#### Public API

```
GET /api/categories
Response: { categories: [{ id, name, slug, description, color, articleCount }] }
-- articleCount: COUNT of published articles in this category

GET /api/tags
Response: { tags: [{ id, name, slug, articleCount }] }
-- articleCount: COUNT of article_tags associations
```

#### Admin API

```
GET    /api/admin/categories          → 全量列表（不分页）
POST   /api/admin/categories          → 创建分类
PUT    /api/admin/categories/[id]     → 更新分类
DELETE /api/admin/categories/[id]     → 删除分类

GET    /api/admin/tags                → 全量列表（不分页）
POST   /api/admin/tags                → 创建标签
PUT    /api/admin/tags/[id]           → 更新标签
DELETE /api/admin/tags/[id]           → 删除标签
```

**创建分类 Request：**
```typescript
{
  name: string,              // 必填，≤50
  slug?: string,             // 可选，不填则自动生成
  description?: string,      // ≤200
  color?: string             // ≤7，如 "#3B82F6"
}
```

**创建标签 Request：**
```typescript
{
  name: string,              // 必填，≤50
  slug?: string              // 可选
}
```

### 4.3 删除行为

| 操作 | 对文章的影响 |
|------|-------------|
| 删除分类 | `articles.category_id` 设为 NULL（`ON DELETE SET NULL`） |
| 删除标签 | `article_tags` 中对应记录 CASCADE 删除 |

### 4.4 Zod 校验

```typescript
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().max(7).optional(),
});

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).optional(),
});
```

### 4.5 组件

```
src/components/admin/
├── CategorySelector.tsx   # 单选下拉（文章编辑页使用）
└── TagSelector.tsx        # 多选标签输入（文章编辑页使用）
```

---

## 5. 用户流程 (User Flows)

### 管理分类

1. 管理员进入 `/admin/categories`
2. 表格展示所有分类（名称、slug、描述、颜色、文章数）
3. 点击"新建分类"→ 填写表单 → 提交
4. 点击分类行 → 编辑名称/描述/颜色/排序
5. 删除分类（有文章的分类删除后文章变为"未分类"）

### 管理标签

1. 管理员进入 `/admin/tags`
2. 表格展示所有标签（名称、slug、文章数）
3. 新建/编辑/删除标签

### 文章中使用

1. 创建/编辑文章时，CategorySelector 下拉选择分类
2. TagSelector 支持搜索已有标签 + 输入新标签名

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 创建重名分类/标签 | UNIQUE 约束报错 → 500，前端应提示"名称已存在" |
| 删除有文章的分类 | SET NULL — 文章保留，category_id 变为 NULL |
| 删除有文章的标签 | CASCADE — article_tags 记录自动删除，文章不受影响 |
| slug 重复 | UNIQUE 约束报错 → 同重名处理 |
| 分类名称更新 | slug 同步更新（如果未手动指定 slug） |

---

## 7. 安全考量 (Security)

- [x] Admin API 全部需要 JWT 鉴权
- [x] Public API 无需鉴权，只读
- [x] 输入校验（Zod）：名称长度、slug 格式

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 数据模型

- `src/lib/db/schema.ts` — categories, tags 表

### Step 2: Validators

- `src/lib/utils/validators.ts` — createCategorySchema, updateCategorySchema, createTagSchema

### Step 3: Public API

- `src/app/api/categories/route.ts`
- `src/app/api/tags/route.ts`

### Step 4: Admin API

- `src/app/api/admin/categories/route.ts` — GET + POST
- `src/app/api/admin/categories/[id]/route.ts` — PUT + DELETE
- `src/app/api/admin/tags/route.ts` — GET + POST
- `src/app/api/admin/tags/[id]/route.ts` — PUT + DELETE

### Step 5: 前端页面

- `src/app/admin/categories/page.tsx`
- `src/app/admin/tags/page.tsx`

---

## 9. Checklist

### Pre-Implementation

- [x] 分类与标签的区别：单选 vs 多选；有颜色/排序 vs 无
- [x] 删除分类行为：SET NULL
- [x] 删除标签行为：CASCADE article_tags

### Post-Implementation

- [x] 分类 CRUD 完整
- [x] 标签 CRUD 完整
- [x] 公开 API 返回文章计数
- [x] CategorySelector / TagSelector 组件可用
