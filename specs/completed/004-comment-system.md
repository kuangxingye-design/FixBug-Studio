# Spec: 评论系统 + 审核管理

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

为博客文章提供公开评论功能。访客可匿名或以昵称+邮箱方式发表评论，支持嵌套回复。所有评论默认进入"待审核"状态，管理员在后台可逐条审批（通过/拒绝）。评论以嵌套树形结构展示，支持两层回复。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] 访客可对文章发表评论（支持匿名或填写昵称/邮箱）
  - [x] 支持嵌套回复（两层：评论 → 回复 → 回复的回复）
  - [x] 所有新评论默认 "pending"，管理员后台审批
  - [x] 公开 API 仅返回已批准的评论

- **P1**
  - [x] 管理员后台评论列表：查看、筛选（按状态/文章）、分页
  - [x] 管理员快捷操作：通过 / 拒绝
  - [x] 管理员回复标记为 `isAdmin: true`，前端特殊样式

- **P2**
  - [ ] 评论通知（邮件提醒管理员有新评论待审核）
  - [ ] 垃圾评论过滤
  - [ ] 评论点赞

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持评论编辑（访客发表后不可修改）
- ❌ 不集成第三方评论系统（Disqus、Giscus 等）
- ❌ 不支持三层以上嵌套（UI 和数据结构支持任意深度，但 Prompt 引导限制为两层）

---

## 4. 设计方案 (Design)

### 4.1 数据模型

```sql
CREATE TABLE comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id   INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id    INTEGER,                    -- NULL = 顶级评论，有值 = 回复
  author_name  TEXT,                       -- 匿名时显示 "Anonymous"
  author_email TEXT,                       -- 可选
  content      TEXT NOT NULL,              -- ≤5000 字符
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  is_admin     INTEGER DEFAULT 0,          -- boolean：管理员回复标记
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
```

**状态流转：**
```
  ┌─────────┐    approve    ┌──────────┐
  │ pending │ ────────────▶ │ approved │
  └─────────┘               └──────────┘
       │                         │
       │    reject               │  (可重新 approve)
       └─────────────────────▶ ┌──────────┐
                               │ rejected │
                               └──────────┘
```

### 4.2 API 设计

#### Public API — 获取文章评论

```
GET /api/articles/[slug]/comments
```

**Response 200:**
```typescript
{
  comments: Array<{
    id, articleId, parentId,
    authorName, content,
    isAdmin, createdAt,
    replies: [                    // 第一层回复
      { ...,
        replies: [...]           // 第二层回复
      }
    ]
  }>
}
```

**构建逻辑：**
1. 查询该文章所有 `status = "approved"` 的评论
2. 按 `parentId` 分层：顶级（`parentId = null`）→ 第一层回复 → 第二层回复
3. 返回嵌套结构

#### Public API — 发表评论

```
POST /api/articles/[slug]/comments
```

```typescript
// Request
{
  authorName?: string,     // 不填则为 "Anonymous"
  authorEmail?: string,    // 可选
  content: string,         // 必填，≤5000
  parentId?: number | null // 回复某条评论时填写
}

// Response 201
{ comment: { ... } }
```

**要点：**
- 所有公开提交的评论 `status = "pending"`（始终待审核）
- `isAdmin = false`（公开接口不可标记为管理员）
- 无需登录

#### Admin API — 评论列表

```
GET /api/admin/comments?page=1&limit=20&status=pending&articleId=1
```

```typescript
// Response 200
{
  comments: Array<{
    id, articleId, articleTitle, articleSlug,
    parentId, authorName, authorEmail,
    content, status, isAdmin, createdAt
  }>,
  pagination: { page, limit, total, totalPages }
}
```

#### Admin API — 审批操作

```
POST /api/admin/comments/[id]/approve  → 设置 status = "approved"
POST /api/admin/comments/[id]/reject   → 设置 status = "rejected"
DELETE /api/admin/comments/[id]        → 物理删除评论
```

### 4.3 Zod 校验

```typescript
const createCommentSchema = z.object({
  authorName: z.string().min(1).max(50).optional(),
  authorEmail: z.string().email().optional().or(z.literal("")),
  content: z.string().min(1, "Comment is required").max(5000),
  parentId: z.number().int().positive().optional().nullable(),
});
```

### 4.4 组件设计

```
src/components/comments/
├── CommentSection.tsx   # 评论区容器（获取评论 + 发表表单）
├── CommentForm.tsx      # 评论输入表单（昵称/邮箱/内容）
├── CommentList.tsx      # 嵌套评论列表渲染
└── CommentItem.tsx      # 单条评论（含回复按钮和嵌套子评论）
```

**CommentSection 数据流：**
1. 挂载时 `GET /api/articles/[slug]/comments`
2. `CommentForm` 提交 → `POST /api/articles/[slug]/comments`
3. 提交成功后乐观更新本地评论列表（新评论标记为 pending 样式）
4. 提示用户"评论已提交，等待审核"

### 4.5 嵌套评论渲染策略

```
顶级评论 1
├── 回复 1.1
│   └── 回复 1.1.1     ← 第二层（视觉缩进更深）
├── 回复 1.2
顶级评论 2
└── 回复 2.1

实现：服务端构建嵌套 JSON → 前端递归渲染 CommentItem + replies
```

---

## 5. 用户流程 (User Flows)

### 访客发表评论

1. 在文章详情页底部找到评论区
2. 填写昵称（可选，默认"Anonymous"）和邮箱（可选）
3. 输入评论内容 → 提交
4. 显示"评论已提交，审核通过后显示"
5. 评论在列表中显示为"待审核"样式（半透明/灰色）

### 访客回复评论

1. 点击某条评论的"回复"按钮
2. CommentForm 出现在该评论下方
3. 输入回复内容 → 提交
4. 同样进入待审核状态

### 管理员审核评论

1. 在管理后台 `/admin/comments` 查看评论列表
2. 按状态筛选：全部 / 待审核 / 已通过 / 已拒绝
3. 阅读评论内容 → 点击"通过"或"拒绝"
4. 通过后评论在公开页面立即可见

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 访客提交空内容 | Zod 校验拦截：content min(1) |
| 访客提交超长内容（>5000字符） | Zod 校验拦截：content max(5000) |
| 回复不存在的评论（parentId 无效） | 评论正常创建（不校验 parentId 存在性，作为顶级评论处理或孤儿评论） |
| 文章不存在 | 404 "Article not found" |
| 文章已删除（CASCADE） | 关联评论自动删除 |
| 同一访客频繁提交 | 无频率限制（P2 考虑） |
| 管理员回复访客 | isAdmin 字段由管理后台创建时手动设为 true（非自动） |
| 审核已拒绝的评论 | 可重新 approve |

---

## 7. 安全考量 (Security)

- [x] 公开评论接口无需登录，但也不返回未审核的评论
- [x] Admin 审批接口需要 JWT 鉴权
- [x] 评论内容不做 HTML 过滤（存储原始文本，渲染时由 React 自动转义）
- [x] authorEmail 可选 —— 不强制收集用户隐私信息
- [ ] 未实现：XSS 过滤（如果前端渲染使用 dangerouslySetInnerHTML）
- [ ] 未实现：Rate Limiting

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 数据模型 + 校验

- `src/lib/db/schema.ts` — comments 表
- `src/lib/utils/validators.ts` — createCommentSchema

### Step 2: Public API

- `src/app/api/articles/[slug]/comments/route.ts` — GET（嵌套列表）+ POST（发表）

### Step 3: Admin API

- `src/app/api/admin/comments/route.ts` — GET（分页列表）
- `src/app/api/admin/comments/[id]/approve/route.ts`
- `src/app/api/admin/comments/[id]/reject/route.ts`
- `src/app/api/admin/comments/[id]/route.ts` — DELETE

### Step 4: 前端组件

- `src/components/comments/CommentSection.tsx`
- `src/components/comments/CommentList.tsx`
- `src/components/comments/CommentItem.tsx`
- `src/components/comments/CommentForm.tsx`

### Step 5: 管理后台页面

- `src/app/admin/comments/page.tsx`

---

## 9. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | Zod 校验边界；嵌套评论结构构建逻辑 |
| 集成测试 | 发表评论 → 状态为 pending；admin approve → 公开可见；admin reject → 公开不可见；嵌套回复结构正确 |
| 手动测试 | 多层嵌套评论 UI 渲染；匿名评论显示"Anonymous"；管理员回复样式区分 |

---

## 10. Checklist

### Pre-Implementation

- [x] 评论状态枚举：pending / approved / rejected
- [x] 嵌套深度：无限（UI 侧建议 ≤2 层视觉缩进）
- [x] 新评论默认状态：pending（始终需审核）
- [x] 管理员回复标记：isAdmin 字段

### Post-Implementation

- [x] 访客可发表评论和回复
- [x] 评论审核流程完整（通过/拒绝）
- [x] 嵌套评论树正确渲染
- [x] 删除文章时评论 CASCADE 删除
