# Spec: 站点设置管理

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

为管理员提供站点全局配置管理页面。配置项以 key-value 形式存储在 `site_settings` 表中，支持动态增删改。配置涵盖博客基础信息、SEO 元数据、社交链接、评论开关等。公开 API 提供部分非敏感配置供前端使用。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] Key-value 形式的站点配置存储（单个 `site_settings` 表）
  - [x] 管理后台提供表单式配置编辑页面
  - [x] 公开 API 返回非敏感配置（站点名、描述、社交链接等）

- **P1**
  - [x] 支持 onConflictDoUpdate（UPSERT）——同一 key 重复写入时更新而非报错

- **P2**
  - [ ] 配置项分组（基础信息 / SEO / 社交 / 功能开关）
  - [ ] 配置变更历史

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持配置导入/导出
- ❌ 不支持多站点配置
- ❌ 不支持配置值类型校验（全部存储为 TEXT）

---

## 4. 设计方案 (Design)

### 4.1 数据模型

```sql
CREATE TABLE site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**设计理由：**
- 极简 key-value 表，不预设列，灵活扩展
- 用 Drizzle 的 `onConflictDoUpdate` 实现 UPSERT
- 所有值存为字符串，消费端自行转换类型

### 4.2 预定义配置项

| Key | 说明 | 示例值 |
|-----|------|--------|
| `site_name` | 博客名称 | "My Tech Blog" |
| `site_description` | 博客描述（SEO） | "A personal blog about..." |
| `site_keywords` | 默认 SEO 关键词 | "tech, programming, AI" |
| `site_logo` | Logo URL | "/uploads/images/logo.png" |
| `site_favicon` | Favicon URL | "/favicon.ico" |
| `social_github` | GitHub 链接 | "https://github.com/..." |
| `social_twitter` | Twitter 链接 | "https://twitter.com/..." |
| `social_linkedin` | LinkedIn 链接 | — |
| `social_website` | 个人网站 | — |
| `footer_text` | 页脚文字 | "© 2026 My Blog" |
| `enable_comments` | 全局评论开关 | "true" / "false" |
| `auto_approve_comments` | 自动通过评论 | "true" / "false" |
| `posts_per_page` | 每页文章数 | "10" |
| `google_analytics_id` | GA 追踪 ID | — |

### 4.3 API 设计

#### Public API

```
GET /api/settings/public
```

```typescript
// Response 200
{
  settings: {
    site_name: "My Tech Blog",
    site_description: "...",
    // 仅返回前端渲染需要的非敏感配置
    // 不返回 google_analytics_id 等（当前实现返回全部，安全考量标记为待优化）
  }
}
```

#### Admin API

```
GET /api/admin/settings
```

```typescript
// Response 200
{ settings: { [key: string]: string } }
// 返回所有配置项的 key-value map
```

```
PUT /api/admin/settings
```

```typescript
// Request
{ [key: string]: string }
// 传入要更新的 key-value 对，未传入的 key 保持不变

// Response 200
{ success: true }
```

**实现要点：**
```typescript
// 遍历请求 body 的每个 key-value，逐条 UPSERT
for (const [key, value] of Object.entries(body)) {
  if (typeof value === "string") {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }
}
```

### 4.4 Zod 校验

```typescript
// 由于 key-value 结构灵活，校验较宽松
const updateSettingsSchema = z.record(z.string(), z.string());
```

---

## 5. 用户流程 (User Flows)

### 编辑站点设置

1. 管理员进入 `/admin/settings`
2. 页面展示分组表单（站点信息、SEO、社交链接、功能开关等）
3. 修改任意字段 → 点击"保存设置"
4. 前端将整个表单序列化为 `Record<string, string>` → `PUT /api/admin/settings`
5. 成功提示"设置已保存"

### 配置生效

- **站点名称 / 描述：** 公开页面 Header / Footer 从公开 API 读取
- **评论开关：** CommentSection 组件根据 `enable_comments` 决定是否渲染
- **自动审核：** 评论提交时检查 `auto_approve_comments`

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 配置项不存在 | 消费端提供默认值，如 `siteName \|\| "My Blog"` |
| 配置值为空字符串 | 正常存储，消费端可视为"该项未设置" |
| PUT 请求中包含非字符串值 | `typeof value === "string"` 检查 → 跳过 |
| 并发修改同一配置项 | SQLite 写锁保证串行执行 |
| 新增未预定义的配置项 | 自由写入（key-value 表不限制 key 的范围） |

---

## 7. 安全考量 (Security)

- [x] Admin API 全部需要 JWT 鉴权
- [x] Public API 无需鉴权，但应注意不暴露敏感配置
- [ ] 当前公开 API 返回所有设置——应在返回前过滤掉敏感 key（如 `google_analytics_id`）

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 数据模型

- `src/lib/db/schema.ts` — siteSettings 表

### Step 2: API 端点

- `src/app/api/admin/settings/route.ts` — GET + PUT
- `src/app/api/settings/public/route.ts` — GET（公开）

### Step 3: 前端页面

- `src/app/admin/settings/page.tsx` — 站点设置表单页面

### Step 4: 配置消费

- Header/Footer 组件 → 从公开 API 或服务端直接查询 siteSettings
- RSS 生成 → 读取 `site_name` 和 `site_description`
- 评论系统 → 读取 `enable_comments` 和 `auto_approve_comments`

---

## 9. Checklist

### Pre-Implementation

- [x] 确定存储方案：key-value 表
- [x] 确定 UPSERT 策略：onConflictDoUpdate
- [x] 确定预定义配置项清单

### Post-Implementation

- [x] 管理后台可编辑所有配置项
- [x] 公开 API 返回前端所需配置
- [x] 配置变更即时生效（无需重启）
- [x] RSS 生成正确使用站点名和描述
