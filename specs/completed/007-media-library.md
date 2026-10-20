# Spec: 媒体库

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

为管理后台提供简单的媒体文件上传和管理功能。管理员可以上传图片（主要用于文章封面和正文插图），系统自动生成唯一文件名并存储到服务器本地文件系统。支持查看已上传的媒体列表、复制文件 URL、删除媒体。

---

## 2. 动机与目标 (Motivation & Goals)

### 目标

- **P0**
  - [x] 文件上传（FormData multipart），存储到 `public/uploads/images/`
  - [x] 自动生成唯一文件名（UUID + 原始扩展名）
  - [x] 数据库记录：文件名、原始名、MIME 类型、大小、URL
  - [x] 管理后台媒体列表（分页）

- **P1**
  - [x] 文件大小限制（10MB）
  - [x] 删除媒体（同时删除文件和 DB 记录）

- **P2**
  - [ ] 图片尺寸记录（width/height 字段已预留）
  - [ ] 图片压缩/缩放
  - [ ] 从媒体库插入图片到文章编辑器

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持非图片文件（当前无 MIME 白名单，但设计意图为图片库）
- ❌ 不支持图片编辑（裁剪、旋转等）
- ❌ 不支持 CDN / 对象存储（使用本地文件系统）
- ❌ 不支持文件夹/目录组织

---

## 4. 设计方案 (Design)

### 4.1 数据模型

```sql
CREATE TABLE media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,             -- UUID 生成的文件名
  original_name TEXT NOT NULL,             -- 用户上传的原始文件名
  mime_type     TEXT NOT NULL,             -- 如 "image/png"
  size          INTEGER NOT NULL,          -- 字节数
  width         INTEGER,                   -- 预留：图片宽度
  height        INTEGER,                   -- 预留：图片高度
  url           TEXT NOT NULL,             -- 如 "/uploads/images/uuid.png"
  alt_text      TEXT,                      -- 预留：无障碍替代文本
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
```

### 4.2 存储路径

```
public/uploads/images/
├── a1b2c3d4-xxxx-xxxx.png
├── e5f6g7h8-xxxx-xxxx.jpg
└── ...
```

**设计理由：**
- `public/` 目录下的文件 Next.js 直接提供静态服务，无需额外路由
- UUID 文件名避免冲突和路径遍历攻击
- 保留原始扩展名便于浏览器识别 MIME 类型

### 4.3 API 设计

#### `GET /api/admin/media?page=1&limit=24`

```typescript
// Response 200
{
  media: Array<{
    id, filename, originalName, mimeType,
    size, width, height, url, altText, createdAt
  }>,
  pagination: { page, limit, total, totalPages }
}
```

#### `POST /api/admin/media`

```
Content-Type: multipart/form-data
字段：file: File  （最大 10MB）
```

```typescript
// Response 201
{ media: { ... } }

// Response 400
{ error: "No file provided" }
{ error: "File too large. Maximum size is 10MB." }
```

**上传流程：**
1. 鉴权 → 2. 校验文件存在性和大小 → 3. `crypto.randomUUID()` 生成唯一名 → 4. `writeFile` 写入磁盘 → 5. 插入 DB 记录 → 6. 返回记录

#### `DELETE /api/admin/media/[id]`

```typescript
// Response 200
{ success: true }

// Response 404
{ error: "Media not found" }
```

**删除流程：**
1. 查 DB 获取文件路径 → 2. 从文件系统删除 → 3. 从 DB 删除记录

### 4.4 关键实现细节

```typescript
// src/app/api/admin/media/route.ts
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "images");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 文件命名
const ext = path.extname(file.name);           // ".png"
const uniqueName = `${crypto.randomUUID()}${ext}`; // "uuid.png"
const filePath = path.join(UPLOAD_DIR, uniqueName);

// 确保目录存在
await mkdir(UPLOAD_DIR, { recursive: true });

// 写入
const buffer = Buffer.from(await file.arrayBuffer());
await writeFile(filePath, buffer);

// URL
const url = `/uploads/images/${uniqueName}`;
```

---

## 5. 用户流程 (User Flows)

### 上传图片

1. 管理员进入 `/admin/media`
2. 页面展示已上传的媒体网格（缩略图 + 文件名）
3. 点击"上传"按钮 → 选择本地图片文件
4. 上传成功后媒体网格自动刷新，新增图片出现在顶部

### 使用图片

1. 在媒体列表中点击图片 → 复制 URL（`/uploads/images/uuid.png`）
2. 在文章 Markdown 编辑器中粘贴：`![alt](url)`

### 删除图片

1. 在媒体列表中点击删除按钮
2. 确认对话框 → 确认 → 文件和服务端记录同时删除

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 上传非图片文件 | 当前无 MIME 白名单，接受所有文件类型 |
| 上传超 10MB 文件 | 400 "File too large. Maximum size is 10MB." |
| 上传空文件 | FormData 中 file.size === 0 → 由前端拦截或后端正常接受（不推荐） |
| 文件名包含特殊字符 | 不影响——使用 UUID 重命名，原始名仅存储在 DB |
| 磁盘空间不足 | `writeFile` 抛出异常 → 500 "Failed to upload file" |
| 删除已被引用的图片 | 删除成功，文章中引用变为死链接（无引用检查） |
| 并发上传同名文件 | UUID 保证唯一，不会冲突 |
| 删除不存在的媒体 | 404 "Media not found" |

---

## 7. 安全考量 (Security)

- [x] 上传接口需要 JWT 鉴权
- [x] UUID 文件名防止路径遍历攻击（`../../../etc/passwd` 无效）
- [x] 文件大小限制防止磁盘 DoS
- [x] 文件存储在 `public/uploads/` 下，通过 Next.js 静态服务提供（不经过应用层处理）
- [ ] 未实现：MIME 类型白名单（当前可上传任意类型文件）
- [ ] 未实现：文件内容扫描

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 数据模型

- `src/lib/db/schema.ts` — media 表

### Step 2: API 端点

- `src/app/api/admin/media/route.ts` — GET（列表）+ POST（上传）
- `src/app/api/admin/media/[id]/route.ts` — DELETE

### Step 3: 前端页面

- `src/app/admin/media/page.tsx` — 媒体库页面（网格展示 + 上传按钮）

---

## 9. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | UUID 文件名生成；路径拼接安全性 |
| 集成测试 | 上传 → DB 记录正确 → 文件存在于磁盘；删除 → DB 记录删除 → 文件删除 |
| 手动测试 | 上传大文件（9MB 成功 vs 11MB 失败）；上传后 URL 可直接访问；删除后 URL 返回 404 |

---

## 10. Checklist

### Pre-Implementation

- [x] 存储位置：public/uploads/images/
- [x] 文件命名：UUID + 原扩展名
- [x] 大小限制：10MB
- [x] 上传方式：FormData multipart

### Post-Implementation

- [x] 上传和列表功能正常
- [x] 删除同时清除文件和 DB 记录
- [x] 上传目录自动创建（mkdir recursive）
