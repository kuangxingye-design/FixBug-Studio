# Specs 协作开发规范

> 本文件定义了团队使用 Specs 进行协作开发的完整规范，包括 spec 是什么、为什么需要它、如何编写、如何评审、以及完整的生命周期管理。

---

## 目录

1. [什么是 Spec](#1-什么是-spec)
2. [为什么要写 Spec](#2-为什么要写-spec)
3. [Spec 文件命名与存放规范](#3-spec-文件命名与存放规范)
4. [Spec 模板与各章节说明](#4-spec-模板与各章节说明)
5. [Spec 编写指南](#5-spec-编写指南)
6. [Spec 生命周期](#6-spec-生命周期)
7. [Spec 评审清单](#7-spec-评审清单)
8. [Spec 与代码的关联](#8-spec-与代码的关联)
9. [反模式与常见错误](#9-反模式与常见错误)
10. [本项目的 Spec 约定](#10-本项目的-spec-约定)

---

## 1. 什么是 Spec

**Spec（Specification，规格说明）** 是一份在编码之前撰写的技术设计文档，它精确描述一个功能或变更要"做什么"、"怎么做"、"为什么这样做"、以及"如何验证它做对了"。

Spec 不是：
- ❌ 需求文档（那是 PM 写的 PRD）
- ❌ 用户故事（那是 Agile 里的 story）
- ❌ API 文档（那是给外部开发者看的）
- ❌ 代码注释（那是解释已写好的代码）

Spec 是：**开发者在动手写代码之前，先想清楚、写下来的设计蓝图。**

---

## 2. 为什么要写 Spec

### 2.1 对个人的价值

| 价值 | 说明 |
|------|------|
| **强制思考** | 写 Spec 的过程迫使你把模糊的想法变成精确的设计 |
| **减少返工** | 在纸上改设计比在代码里改设计便宜 10 倍 |
| **防止遗漏** | 模板中的 Checklist 确保你不会忘记边界情况、错误处理、可访问性等 |
| **加速实现** | 有一份清晰的 Spec，写代码就像按图施工 |

### 2.2 对团队的价值

| 价值 | 说明 |
|------|------|
| **对齐认知** | Spec 是团队对"我们要做什么"的唯一真相来源 |
| **异步评审** | 评审者可以在自己方便的时间阅读和评论 Spec，不需要同步开会 |
| **降低风险** | 在代码写之前就能发现设计问题 |
| **知识沉淀** | Spec 归档后成为团队的知识资产，新人可以快速了解历史决策 |
| **AI 协作** | Spec 是 AI 编码助手的最佳输入——AI 读 Spec 比读你的大脑准确得多 |

### 2.3 什么时候必须写 Spec

- ✅ 新功能（涉及 ≥2 个文件或 ≥1 个新 API 端点）
- ✅ 架构变更（如数据库 schema 变更、路由重构、状态管理方案切换）
- ✅ API 设计（任何新的或变更的 API 端点）
- ✅ 跨模块改动（影响多个组件或 lib 模块）
- ✅ 外部依赖引入

### 2.4 什么时候可以不写 Spec

- ❌ 纯 Bug 修复（行为符合预期但实现有误）
- ❌ 拼写错误、格式调整
- ❌ 单文件内的小重构（不改变外部接口）

---

## 3. Spec 文件命名与存放规范

### 3.1 目录结构

```
specs/
├── README.md              # 本文件 — Spec 规范与指南
├── TEMPLATE.md            # 空白 Spec 模板
├── active/                # 正在开发中的 Spec
│   └── .gitkeep
├── completed/             # 已实现并归档的 Spec
│   ├── 001-auth-system.md
│   ├── 002-article-management.md
│   ├── 003-ai-document-process.md
│   ├── 004-comment-system.md
│   ├── 005-ai-document-merge.md
│   ├── 006-taxonomy-management.md
│   ├── 007-media-library.md
│   ├── 008-site-settings.md
│   └── 009-public-blog.md
└── archived/              # 废弃或被替代的 Spec
    └── .gitkeep
```

### 3.2 命名规范

```
{序号或日期}-{简短描述}.md
```

示例：
- `001-article-version-history.md`
- `2026-07-10-dark-mode-support.md`
- `002-ai-document-merge-workflow.md`

**规则：**
- 使用 kebab-case（小写字母 + 连字符）
- 包含序号或日期以便排序
- 描述简短但明确，让读者不看内容也能猜到是什么

### 3.3 存放位置

| 状态 | 目录 | 说明 |
|------|------|------|
| 起草中 | `specs/active/` | Spec 正在编写，尚未完成评审 |
| 已通过 | `specs/active/` | 评审通过，正在实现中 |
| 已实现 | `specs/completed/` | 代码已合并，Spec 归档 |
| 已废弃 | `specs/archived/` | 不再适用或被替换的 Spec |

---

## 4. Spec 模板与各章节说明

> 空白模板文件：[TEMPLATE.md](./TEMPLATE.md)

一个完整的 Spec 包含以下章节：

### 4.1 元数据 (Metadata)

```markdown
# Spec: [功能名称]

| 字段 | 值 |
|------|-----|
| **作者** | @yourname |
| **日期** | YYYY-MM-DD |
| **状态** | Draft / In Review / Approved / In Progress / Done / Archived |
| **版本** | 1.0 |
| **关联 Issue** | #123 |
```

**说明：** 元数据让读者一眼看清这个 Spec 的负责人、当前阶段和历史版本。状态字段必须保持更新。

### 4.2 概述 (Overview)

> 用 3-5 句话说明这个功能是什么、解决什么问题、目标用户是谁。

**写作原则：**
- 让一个不了解上下文的人读完就能理解要做什么
- 先说问题（Why），再说方案（What）
- 不要写实现细节

**示例（好的）：**
> 当前博客只有手动编写文章的功能。管理员希望上传原始 .md 文件，由 AI 自动转换为结构化文章。本 Spec 定义 AI 文档处理的完整流程：上传 → AI 处理（SSE 流式返回进度）→ 边栏预览 → 人工确认发布。

**示例（不好的）：**
> 加一个 AI 处理功能，用 Claude API，streaming 返回结果。

### 4.3 动机与目标 (Motivation & Goals)

```markdown
### 动机
- 为什么现在要做这个功能？
- 当前有什么痛点？

### 目标
- **必须实现 (P0)**：不实现这些，功能等于没做
- **应该实现 (P1)**：做了会显著提升体验
- **可选实现 (P2)**：锦上添花，时间不够就砍
```

**写作原则：**
- 用用户/业务语言描述目标，不要用技术语言
- P0/P1/P2 优先级必须明确——这决定了评审和排期的依据
- 每个目标应该是可验证的（"用户可以..."）

### 4.4 非目标 (Non-Goals)

> 明确列出这个 Spec 刻意不做的事情。

**为什么需要 Non-Goals？**
- 防止范围蔓延（scope creep）
- 让评审者知道你的边界
- 给后续 Spec 留下引子

**示例：**
> - 不支持批量上传多个文件
> - 不支持非 Markdown 格式（如 Word、HTML）
> - AI 处理不支持自定义 Prompt（使用内置 Prompt）

### 4.5 设计方案 (Design)

这是 Spec 的核心部分，根据功能类型选择子章节：

```markdown
### 架构概览
> 一张图（可用 ASCII art 或 Mermaid）展示整体流程和数据流。

### 路由设计（如果是新页面/API）
> 列出新的路由、HTTP 方法、请求/响应格式。

### 组件设计（如果是 UI 功能）
> 组件树、Props 接口、状态管理方案。

### 数据模型（如果涉及数据库变更）
> 新增/修改的表、字段、索引、迁移策略。

### API 设计（如果涉及接口变更）
> 端点、请求体、响应体、错误码、鉴权要求。

### AI 交互设计（如果涉及 AI 调用）
> Prompt 设计、Streaming 策略、错误处理、Token 预算。
```

**写作原则：**
- 图表优先于文字——一图胜千言
- 接口定义使用 TypeScript 类型或 JSON Schema——精确、无歧义
- 每个设计决策都要写**为什么**，而不是只写**是什么**

### 4.6 用户流程 (User Flows)

```markdown
### 主流程
1. 用户点击"上传文档"按钮
2. 选择本地 .md 文件
3. 点击"开始 AI 处理"
4. 实时看到 AI 处理进度（SSE 流式返回）
5. 在预览面板查看处理结果
6. 确认并发布 / 手动编辑后发布
```

**写作原则：**
- 用编号列表描述用户在 UI 上的每一步操作
- 包含分支流程（如"如果处理失败..."）
- 包含边缘情况（如"上传非 .md 文件时..."）

### 4.7 边缘情况与错误处理 (Edge Cases)

```markdown
| 场景 | 预期行为 |
|------|----------|
| 上传文件超过 10MB | 显示错误提示，阻止上传 |
| AI API 超时 | 显示超时提示，允许重试 |
| AI 返回格式异常 | 降级为原始内容展示，标记处理失败 |
| 用户在处理中关闭页面 | SSE 连接自动断开，服务端不保留中间状态 |
| 并发上传多个文件 | 排队处理，同时只处理一个 |
| 空文件上传 | 提示"文件内容为空" |
```

**写作原则：**
- 用表格呈现，左边是场景，右边是预期行为
- 覆盖 3 类边缘情况：输入边界、网络/服务异常、并发/竞态

### 4.8 安全考量 (Security)

```markdown
- 文件上传的 MIME 类型校验
- AI API Key 仅存储在服务端，不暴露给前端
- 非管理员无法访问 AI 处理接口
- SSE 端点需要 JWT 鉴权
- 上传文件大小限制防止 DoS
```

### 4.9 性能考量 (Performance)

```markdown
- SSE 流式返回，首字节时间 < 500ms
- 大文件（>1MB）分片处理
- AI 处理超时设置为 60s
- 处理结果缓存，避免重复处理相同内容
```

### 4.10 可访问性 (Accessibility)

```markdown
- 上传区域支持键盘操作（Enter/Space 触发文件选择）
- 处理进度通过 aria-live 区域播报
- 错误提示与表单字段通过 aria-describedby 关联
- 拖拽上传区域有明确的视觉指示
```

### 4.11 实现计划 (Implementation Plan)

```markdown
### 分步实现

1. **Step 1: API 端点**
   - 创建 `POST /api/ai/process` 端点
   - 实现 SSE streaming
   - 文件：`src/app/api/ai/process/route.ts`

2. **Step 2: AI 处理逻辑**
   - 实现 `src/lib/ai/process.ts`
   - 设计 AI Prompt
   - 解析 AI 返回的结构化数据

3. **Step 3: 前端上传组件**
   - 创建 `UploadZone` 组件
   - 实现拖拽和点击上传
   - 文件类型和大小校验

4. **Step 4: 处理状态展示**
   - 创建 `ProcessingStatus` 组件
   - 连接 SSE 事件流
   - 展示分步进度

5. **Step 5: 预览与发布**
   - 创建 `AIPreviewPanel` 组件
   - 实现原始/处理后对照视图
   - 确认发布流程
```

**写作原则：**
- 每个 Step 应该是一个可以独立验证的增量
- 写出涉及的文件路径
- Step 应该有明确的完成标准

### 4.12 测试策略 (Testing Strategy)

```markdown
| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | AI 处理逻辑（Mock Claude API）、文件校验逻辑 |
| 集成测试 | API 端点鉴权、SSE 流返回 |
| E2E 测试 | 完整的上传→处理→发布流程 |
| 手动测试 | 不同大小的文件、特殊字符文件名、网络断开恢复 |
```

### 4.13 回滚计划 (Rollback Plan)

```markdown
- 该功能为新增功能，不影响现有流程
- 如需回滚：移除 AI 处理相关路由和组件即可
- Feature Flag: `ENABLE_AI_PROCESSING`（环境变量控制开关）
```

### 4.14 Checklist

```markdown
## Pre-Implementation Checklist

- [ ] 设计已通过评审（至少 1 位 reviewer 批准）
- [ ] API 接口定义完整（请求/响应格式、错误码）
- [ ] 数据模型已确认（如需 schema 变更）
- [ ] 边缘情况已覆盖
- [ ] 安全考量已确认
- [ ] 可访问性需求已确认
- [ ] 测试策略已明确
- [ ] 依赖项已就绪（API key、第三方库等）

## Post-Implementation Checklist

- [ ] 代码通过 Code Review
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成（含边缘情况）
- [ ] README/文档已更新
- [ ] Spec 状态更新为 Done
- [ ] Spec 归档至 completed/
```

---

## 5. Spec 编写指南

### 5.1 黄金法则

1. **精确优于模糊** — 用具体的接口定义、数据类型、状态值，不要用"大概"、"可能"、"差不多"
2. **图表优于文字** — 架构图、流程图、时序图比大段文字更清晰
3. **为什么优于是什么** — 每个设计决策都要解释原因
4. **读者视角优先** — 假定读者对你的想法一无所知，写清楚上下文

### 5.2 好的 Spec 的特征

```markdown
✅ 新人读完能理解要做什么、为什么做、怎么做
✅ 设计决策都有"为什么"的解释
✅ 边缘情况被明确列出，而不是留白
✅ 包含具体的接口定义（TypeScript 类型 / JSON Schema）
✅ 包含可视化（Mermaid 图表、ASCII 流程图）
✅ 非目标被明确排除
✅ 优先级 P0/P1/P2 清晰
✅ 有可验证的 Checklist
```

### 5.3 差的 Spec 的特征

```markdown
❌ 只有功能名称，没有设计细节
❌ 把所有事情都标成 P0
❌ "到时候再说"（边缘情况留白）
❌ 只有文字没有图表
❌ 没有 Non-Goals（范围模糊）
❌ 设计决策没有解释"为什么"
❌ Checklist 全是 "TODO"
❌ 长达 50 页（spec 应该精炼，不是 PhD 论文）
```

### 5.4 Spec 长度建议

| 功能规模 | 建议长度 | 示例 |
|----------|----------|------|
| 小型（1-2 天） | 1-3 页 | 加一个标签过滤功能 |
| 中型（3-5 天） | 3-8 页 | AI 文档处理流程 |
| 大型（1-2 周） | 8-15 页 | 管理后台完整重构 |

> **原则：** 够用就好。Spec 的目标是清晰传达设计意图，不是凑字数。

---

## 6. Spec 生命周期

```
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌───────┐
│  Draft   │───▶│ In Review │───▶│ Approved  │───▶│   Done   │───▶│Archive│
└──────────┘    └───────────┘    └───────────┘    └──────────┘    └───────┘
     │               │                │                │
     │               ▼                │                │
     │          ┌─────────┐           │                │
     └─────────▶│ Reject  │◀──────────┘                │
                └─────────┘                            │
                     │                                 │
                     ▼                                 │
              ┌────────────┐                           │
              │  Archived  │◀──────────────────────────┘
              └────────────┘
```

### 各状态说明

| 状态 | 含义 | Spec 位置 | 谁负责 |
|------|------|-----------|--------|
| **Draft** | 作者正在编写 | `specs/active/` | 作者 |
| **In Review** | 已提交，等待评审 | `specs/active/` | Reviewer |
| **Approved** | 评审通过，可以开始实现 | `specs/active/` | 作者实现 |
| **In Progress** | 正在实现中 | `specs/active/` | 作者 |
| **Done** | 代码已合并验证通过 | `specs/completed/` | — |
| **Rejected** | 评审不通过或决定不做 | `specs/archived/` | — |
| **Archived** | 历史 Spec（被新 Spec 替代或功能已移除） | `specs/archived/` | — |

### 状态流转规则

1. **Draft → In Review**：作者完成初稿，自检 Checklist 通过，提交 PR
2. **In Review → Approved**：至少 1 位 Reviewer 批准，无 unresolved 评论
3. **In Review → Rejected**：评审决定不做，或需要大幅重写（重新提交新 Spec）
4. **Approved → In Progress**：开始编写代码
5. **In Progress → Done**：代码合并 + 测试通过 + Checklist 全勾
6. **Done → Archived**：功能下线 / 被新 Spec 替代

---

## 7. Spec 评审清单

作为 Reviewer，阅读 Spec 时使用以下清单：

### 7.1 必须检查（Must Check）

- [ ] **目标清晰吗？** 我能用一句话说出这个 Spec 要做什么吗？
- [ ] **范围明确吗？** Non-Goals 是否清晰排除了不该做的事情？
- [ ] **设计合理吗？** 技术方案是否正确？是否有更简单的方案？
- [ ] **边缘情况覆盖了吗？** 错误处理、空状态、边界值是否都考虑到了？
- [ ] **安全吗？** 鉴权、数据校验、敏感信息保护是否到位？
- [ ] **可测试吗？** Checklist 中的验收标准是否可验证？
- [ ] **与现有架构一致吗？** 是否遵循了项目的技术栈和代码组织方式？

### 7.2 建议检查（Should Check）

- [ ] **API 设计 RESTful 吗？** 命名、HTTP 方法、状态码是否规范？
- [ ] **数据库 Schema 合理吗？** 索引、关联、迁移策略是否考虑周全？
- [ ] **UI 组件可复用吗？** 新组件是否可以抽象为通用组件？
- [ ] **性能考量充分吗？** 大数据量、高并发、慢网络场景是否考虑？
- [ ] **可访问性达标吗？** 键盘导航、屏幕阅读器、颜色对比度是否考虑？

### 7.3 评审礼仪

- **关注设计，不是语法** — 拼写错误不重要，逻辑漏洞重要
- **提出替代方案** — 不只说"这个不好"，要说"可以考虑 X"
- **及时响应** — 尽量在 24 小时内完成评审
- **鼓励而非打击** — "这个设计有个问题，我们可以讨论一下怎么解决"比"这个设计有问题"更好

---

## 8. Spec 与代码的关联

### 8.1 PR 关联 Spec

每个实现 Spec 的 PR 必须在描述中引用对应的 Spec：

```markdown
## 关联 Spec
- Spec: [specs/active/003-article-version-history.md](./specs/active/003-article-version-history.md)

## 实现内容
- 新增 VersionHistory 组件
- 新增 /api/admin/articles/[id]/versions 端点
- 新增 article_versions 表
```

### 8.2 Spec 驱动开发的 Git 工作流

```bash
# 1. 创建 Spec
git checkout -b spec/ai-merge-workflow
# 编写 specs/active/005-ai-merge-workflow.md
git commit -m "spec: add AI merge workflow spec"
# 提交 PR，等待评审通过

# 2. 实现 Spec
git checkout -b feat/ai-merge-workflow
# 按照 Spec 的 Implementation Plan 逐步实现
git commit -m "feat: implement AI merge workflow (Spec #005)"
# 在 PR 中关联 Spec
```

### 8.3 代码中的 Spec 引用

对于复杂逻辑，在代码中引用 Spec 可以帮助未来的维护者理解上下文：

```typescript
/**
 * AI 文档合并处理
 * 设计详见: specs/completed/005-ai-merge-workflow.md
 *
 * 核心流程:
 * 1. 解析现有文章结构
 * 2. 分析新文档内容
 * 3. 调用 Claude 进行智能合并
 * 4. 返回合并建议
 */
export async function mergeDocuments(existing: Article, incoming: string) {
  // ...
}
```

---

## 9. 反模式与常见错误

### 9.1 过度设计 (Over-Specing)

**错误：** 为一个简单功能写了 20 页 Spec，包含各种"将来可能"的扩展。

**正确做法：** Spec 只描述当前要做的。未来需求放 Non-Goals 或留到下一个 Spec。

### 9.2 设计不足 (Under-Specing)

**错误：** "加一个评论功能"——没有 API 设计、没有组件设计、没有权限模型。

**正确做法：** 至少覆盖：API 端点、数据模型、UI 组件树、权限控制、错误处理。

### 9.3 先写代码再补 Spec

**错误：** 代码写完了，补一个 Spec 归档——Spec 变成了文档任务而非设计工具。

**正确做法：** Spec 在设计阶段写，指导编码。在实现过程中可以更新 Spec（记录设计变更），但主要设计必须在编码之前完成。

### 9.4 Spec 成了永不更新的僵尸文档

**错误：** Spec 归档后不再维护，和实际代码严重脱节。

**正确做法：** 重大设计变更时更新 Spec 或创建新的 Spec 替代旧版本，旧版本移到 `archived/`。

### 9.5 在 Spec 里写代码

**错误：** Spec 里贴满了大段代码。

**正确做法：** Spec 使用伪代码、接口签名、数据结构定义。具体实现在代码里。Spec 描述"接口长什么样"，代码实现"接口怎么做到的"。

---

## 10. 本项目的 Spec 约定

### 10.1 技术栈约束

在为本项目编写 Spec 时，必须遵守以下技术约束：

| 约束 | 说明 |
|------|------|
| **框架** | Next.js 15 App Router，不使用 Pages Router |
| **语言** | TypeScript（strict mode） |
| **数据库** | SQLite via better-sqlite3 + Drizzle ORM |
| **样式** | Tailwind CSS 3 + @tailwindcss/typography |
| **AI** | Anthropic Claude API（通过 `src/lib/ai/client.ts`） |
| **认证** | 自定义 JWT + httpOnly cookie（通过 `src/lib/auth/session.ts`） |
| **组件** | React Server Components 优先，需要交互性时才用 Client Components |

### 10.2 项目目录约束

在 Spec 中指定文件路径时，遵循以下约定：

```
新页面   → src/app/(public)/{feature}/page.tsx  或 src/app/admin/{feature}/page.tsx
新 API   → src/app/api/{domain}/{resource}/route.ts
新组件   → src/components/{domain}/{ComponentName}.tsx
新库函数 → src/lib/{domain}/{functionality}.ts
新类型   → src/types/{domain}.ts
数据库   → src/lib/db/schema.ts（修改现有文件）
```

### 10.3 命名约束

- 文件名：kebab-case
- 组件名：PascalCase
- 函数名：camelCase
- API 路由：kebab-case
- 数据库表：snake_case
- 数据库列：snake_case
- TypeScript 类型/接口：PascalCase

### 10.4 本项目的组件规范

```
src/components/
├── ui/          # 通用 UI 原语（Button, Input, Card, Badge...）
├── layout/      # 布局组件（Header, Footer, Sidebar...）
├── articles/    # 文章相关组件
├── comments/    # 评论相关组件
├── admin/       # 管理后台专有组件
└── shared/      # 跨域共享组件（MarkdownRenderer, Pagination...）
```

### 10.5 示例 Spec

参见 [completed/](./completed/) 目录下的完整 Spec 归档，例如 [005-ai-document-merge.md](./completed/005-ai-document-merge.md) — 基于本项目 AI 文档合并功能的完整 Spec 示例。

---

## 附录：快速开始

### 新功能开发流程（15 分钟版）

```bash
# 1. 复制模板
cp specs/TEMPLATE.md specs/active/XXX-my-feature.md

# 2. 填写 Spec（10 分钟）
# - 元数据（1 分钟）
# - 概述 + 动机 + 非目标（3 分钟）
# - 设计方案（5 分钟）
# - Checklist（1 分钟）

# 3. 自检（2 分钟）
# - 边缘情况是否覆盖？
# - 安全/性能是否考虑？
# - 有没有遗漏的 Non-Goal？

# 4. 提交评审（3 分钟）
git checkout -b spec/my-feature
git add specs/active/XXX-my-feature.md
git commit -m "spec: add XXX feature specification"
# 创建 PR，@一位 reviewer
```

### Spec 编写顺序建议

对于大多数功能，按以下顺序编写最高效：

1. **元数据** — 先把基本信息填好
2. **非目标** — 先明确边界，防止跑偏
3. **概述** — 说清楚要做什么
4. **设计方案** — 核心内容，花最多时间
5. **用户流程** — 用流程验证设计
6. **边缘情况** — 从流程推导边缘情况
7. **安全 / 性能 / 可访问性** — 交叉验证
8. **实现计划** — 把设计拆成可执行的步骤
9. **Checklist** — 把验收标准列出来

---

> **最后一条原则：Spec 是工具，不是负担。** 花 30 分钟写一个清晰的 Spec，比花 3 小时调试一个模糊的设计划算得多。但也不要为了"写完美 Spec"而无限拖延——够用就好，开始写代码吧。
