# Spec: 认证系统 (JWT Session Auth)

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |

---

## 1. 概述 (Overview)

为博客系统实现基于 JWT 的自定义认证体系：管理员通过邮箱+密码登录，服务端签发 JWT 并写入 httpOnly Cookie，后续请求通过 Next.js Middleware 自动验证。支持首次运行时的管理员初始化（Setup）流程、登出、以及 API 层和页面层的双重鉴权。

**目标用户：** 博客唯一的或少数几个管理员（单用户/小团队博客）。

---

## 2. 动机与目标 (Motivation & Goals)

### 动机

- Next.js 博客需要一个轻量级的认证方案，不需要 NextAuth.js 等重型库的复杂度
- 需要同时保护 API 路由和页面路由
- 管理后台所有操作都要求登录态

### 目标

- **P0**
  - [x] 邮箱 + 密码登录，签发 JWT，写入 httpOnly Cookie
  - [x] Next.js Middleware 自动拦截 `/admin/*` 路由，未登录跳转登录页
  - [x] API 层 `getCurrentUser()` 函数供各端点复用
  - [x] 登出功能（清除 Cookie + 删除 DB Session 记录）
  - [x] 首次运行 Setup 流程（系统中无管理员时允许创建第一个管理员）
  - [x] 密码使用 bcryptjs 哈希存储

- **P1**
  - [x] Session 同时存储于数据库（`sessions` 表），支持服务端主动失效
  - [x] JWT 7 天过期 + DB Session 过期时间双重校验

- **P2**
  - [ ] 密码修改功能
  - [ ] 多用户支持（当前固定 `role: "admin"`）

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持 OAuth / 第三方登录
- ❌ 不支持注册（仅管理员可通过 Setup 创建账户）
- ❌ 不支持角色权限细分（所有用户均为 admin）
- ❌ 不支持邮箱验证

---

## 4. 设计方案 (Design)

### 4.1 架构概览

```
┌──────────────┐     Login POST      ┌──────────────────┐
│   浏览器      │ ──────────────────▶ │ /api/auth/login   │
│  (Cookie)    │ ◀──── Set-Cookie ── │  验证密码          │
│              │                     │  签发 JWT          │
│              │                     │  写 DB Session     │
│              │                     │  写 httpOnly Cookie│
└──────┬───────┘                     └──────────────────┘
       │
       │ 后续请求 (Cookie 自动携带)
       ▼
┌──────────────────────────────────────────────────────┐
│  Next.js Middleware (src/middleware.ts)               │
│  - 匹配 /admin/* 路由 (排除 /admin/login)             │
│  - 从 Cookie 读 token → jwtVerify → 放行或重定向     │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  API Route Handler / Page                            │
│  - 调用 getCurrentUser() 获取当前用户                 │
│  - null → 401 Unauthorized                           │
│  - user → 继续处理请求                                │
└──────────────────────────────────────────────────────┘
```

### 4.2 数据模型

```sql
-- users 表（Drizzle schema: src/lib/db/schema.ts）
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcryptjs, 10 rounds
  display_name  TEXT NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- sessions 表
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,           -- JWT 前 32 字符
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,           -- Unix timestamp
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
```

### 4.3 API 设计

#### `POST /api/auth/login`

```typescript
// Request
{ email: string; password: string }

// Response 200
{
  user: { id, email, username, displayName, role, avatarUrl }
}

// Response 400 — Zod 校验失败
{ error: "Invalid input", details: { email: ["Invalid email address"], ... } }

// Response 401 — 邮箱或密码错误
{ error: "Invalid email or password" }
```

**实现要点：**
- 不区分"用户不存在"和"密码错误"——统一返回 401，防止邮箱枚举攻击
- 成功后调用 `createSession()`：签发 JWT（HS256, 7d）→ 写 `sessions` 表 → 设置 `blog_session` httpOnly Cookie

#### `POST /api/auth/logout`

```typescript
// Request — 无 Body，Cookie 中携带 token
// Response 200
{ success: true }
```

**实现要点：**
- 从 Cookie 读 token → 删除 `sessions` 表中对应记录 → 清除 Cookie

#### `GET /api/auth/me`

```typescript
// Response 200（已登录）
{ user: { id, email, username, displayName, role, avatarUrl, bio } }

// Response 401（未登录）
{ error: "Unauthorized" }
```

#### `POST /api/auth/setup`

```typescript
// Request
{ email: string; username: string; password: string; displayName: string }

// Response 201 — 管理员创建成功，自动登录
{ user: { id, email, username, displayName, role } }

// Response 403 — 系统中已存在管理员
{ error: "Admin user already exists" }
```

**实现要点：**
- 先调用 `hasAdminUser()` 检查 DB 中是否已有用户
- 有 → 返回 403
- 无 → 创建用户 + 自动签发 Session

### 4.4 Middleware 设计

```
文件: src/middleware.ts
匹配规则: matcher: "/admin/:path*"

流程:
1. pathname 匹配 /admin/(?!login) → 进入鉴权检查
2. 从 request.cookies 读取 blog_session
3. 无 Cookie → 302 重定向到 /admin/login?redirect={原始路径}
4. jwtVerify(token, secret) 失败 → 302 重定向到 /admin/login
5. 验证通过 → NextResponse.next()
```

**关键设计决策：**
- Middleware 只做 JWT 签名验证（快），不做 DB 查询（慢）
- 详细的 DB Session 有效性检查下沉到 API 层的 `getCurrentUser()`
- `/admin/login` 被排除在保护之外，否则会导致重定向死循环

### 4.5 模块架构

```
src/lib/auth/
├── password.ts    # hashPassword(), verifyPassword() — bcryptjs 封装
└── session.ts     # createSession(), destroySession(), getCurrentUser(),
                   # verifyToken(), hasAdminUser(), requireAuth()
```

**`getCurrentUser()` 详细流程：**
1. 从 `cookies()` 读取 `blog_session`
2. `verifyToken()` → JWT 验证和过期检查
3. 查 `sessions` 表：token 前 32 字符 = session.id，且未过期
4. 查 `users` 表：获取用户完整信息
5. 任一步骤失败 → 返回 null

---

## 5. 用户流程 (User Flows)

### 首次使用 — Setup

1. 用户访问 `/admin`，Middleware 检测未登录 → 重定向到 `/admin/login`
2. 前端检测系统中无管理员 → 显示 Setup 表单（而非 Login 表单）
3. 填写 email、username、password、displayName → 提交 `POST /api/auth/setup`
4. 成功 → 自动登录，跳转管理后台首页

### 日常登录

1. 用户访问 `/admin` → Middleware 检测未登录 → 重定向 `/admin/login`
2. 填写 email + password → 提交 `POST /api/auth/login`
3. 成功后浏览器自动存储 httpOnly Cookie → 跳转管理后台

### 登出

1. 点击"登出"按钮 → `POST /api/auth/logout`
2. Cookie 被清除 + DB Session 被删除 → 跳转登录页

### Session 过期

1. 用户 7 天后再次访问 → JWT 已过期 → Middleware `jwtVerify` 失败 → 重定向登录页

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 未配置 SESSION_SECRET | 使用默认值 `"dev-secret-change-me"`，生产环境必须配置 |
| JWT 签名被篡改 | `jose.jwtVerify` 抛出异常 → catch 返回 302 重定向 |
| DB 中 Session 已删除但 JWT 仍有效 | `getCurrentUser()` 中 DB 查询失败 → 返回 null |
| 用户被删除但有未过期 Session | sessions 表有 CASCADE 外键，用户删除时 Session 自动清除 |
| 同一用户多设备登录 | 每次登录创建独立 Session（JWT 不同），互不影响 |
| 登录页重定向循环 | `/admin/login` 被 middleware matcher 排除，不会触发鉴权 |

---

## 7. 安全考量 (Security)

- [x] **密码存储：** bcryptjs 10 轮哈希
- [x] **Cookie 安全标记：** httpOnly（防 XSS 窃取）+ secure（生产环境 HTTPS only）+ sameSite: "lax"
- [x] **防暴力破解：** 不区分"用户不存在"和"密码错误"，统一返回相同错误信息
- [x] **Setup 接口防护：** `hasAdminUser()` 检查 → 系统中已有管理员时直接返回 403
- [x] **JWT 密钥：** 从环境变量 `SESSION_SECRET` 读取，不硬编码
- [x] **DB Session 双重校验：** JWT 有效 ≠ Session 有效（服务端可主动删除 Session 来强制登出）
- [ ] 未实现：登录频率限制（Rate Limiting）
- [ ] 未实现：密码复杂度要求（当前仅 ≥6 字符）

---

## 8. 实现计划 (Implementation Plan)

### Step 1: 密码工具

- **文件：** `src/lib/auth/password.ts`
- **内容：** `hashPassword()`, `verifyPassword()` — bcryptjs 封装

### Step 2: Session 管理

- **文件：** `src/lib/auth/session.ts`
- **内容：** `createToken()`, `verifyToken()`, `createSession()`, `destroySession()`, `getCurrentUser()`, `hasAdminUser()`, `requireAuth()`

### Step 3: Middleware

- **文件：** `src/middleware.ts`
- **内容：** 拦截 `/admin/*` → JWT 验证 → 放行或重定向

### Step 4: API 端点

- **文件：** `src/app/api/auth/login/route.ts`, `logout/route.ts`, `me/route.ts`, `setup/route.ts`
- **内容：** 四个认证相关端点

### Step 5: Zod 校验 Schema

- **文件：** `src/lib/utils/validators.ts`
- **内容：** `loginSchema`, `setupSchema`, `updateProfileSchema`, `changePasswordSchema`

---

## 9. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | `hashPassword`/`verifyPassword`；`createToken`/`verifyToken`（HS256 加解密）；`loginSchema` 校验规则 |
| 集成测试 | 完整登录流程（Setup → Login → GET /me → Logout）；登录失败场景（错误密码、不存在邮箱）；Setup 后再次 Setup 返回 403 |
| 手动测试 | Cookie 清除后访问 /admin 跳转；7 天后 Session 过期；多设备登录互不干扰 |

---

## 10. 回滚计划 (Rollback Plan)

- 认证系统是整个管理后台的基础设施，回滚需同步处理
- 移除 `src/lib/auth/` 目录 + `src/middleware.ts` + 4 个 auth 端点
- 所有 admin API 端点中的 `getCurrentUser()` 调用需移除或替换

---

## 11. Checklist

### Pre-Implementation

- [x] 选择 jose 而非 jsonwebtoken（Edge Runtime 兼容）
- [x] 选择 bcryptjs 而非 bcrypt（纯 JS，无原生依赖）
- [x] Session Cookie 命名确定：`blog_session`
- [x] JWT 算法选择 HS256（对称加密，适合单服务部署）
- [x] Session 过期时间：7 天

### Post-Implementation

- [x] 登录/登出流程跑通
- [x] Middleware 保护 /admin/* 路由生效
- [x] API 层 `getCurrentUser()` 正确返回用户或 null
- [x] Setup 流程仅首次可用
- [x] httpOnly Cookie 浏览器中不可被 JS 读取

---

> **设计决策记录（ADR）：**
> 1. **为什么不用 NextAuth.js？** — 博客只有少数管理员，不需要 OAuth / 多 Provider / 数据库适配器。自定义 JWT 方案约 200 行代码，零外部认证依赖。
> 2. **为什么 Session 既要 JWT 又要 DB 记录？** — JWT 提供无状态快速验证（Middleware 层），DB 记录提供服务端主动失效能力（删除 Session = 强制登出）。两层的过期时间均为 7 天。
> 3. **为什么 Middleware 不做 DB 查询？** — Next.js Middleware 运行在 Edge Runtime，而 better-sqlite3 是 Node.js 原生模块。在 Middleware 中做 DB 查询会导致所有请求降级到 Node.js Runtime，失去 Edge 性能优势。
