# Spec: AI 文档合并工作流

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |
| **关联 Spec** | 003-ai-document-process（AI 文档处理 — 本功能的依赖） |

---

## 1. 概述 (Overview)

本 Spec 定义 AI 文档**合并**（Merge）功能：管理员在已有文章的基础上，上传一份新的 .md 文件，由 AI（Claude）智能地将新内容合并到现有文章中——包括定位最佳插入位置、去重、标记冲突——而非简单粗暴地追加或覆盖。

**目标用户：** 博客管理员。适用于文章需要持续维护更新的场景（如技术文档随版本演进、知识库逐步积累）。

---

## 2. 动机与目标 (Motivation & Goals)

### 动机

- 已有的 AI 处理功能（`POST /api/ai/process`）只能从零创建新文章，无法对已有文章进行增量更新
- 手动合并文档耗时且容易出错（遗漏、重复、格式不一致）
- 博客文章通常是"活的"知识资产，需要持续积累而非一次性发布

### 目标

- **P0（必须实现）**
  - [x] 管理员可通过 API 上传新 .md 文件并指定目标文章 ID
  - [x] AI 智能合并：去重、定位插入位置、保持格式一致
  - [x] SSE 流式返回合并进度（analyzing → calling_ai → processing_response → complete）
  - [x] 返回合并后的完整内容 + 变更摘要 + 变更高亮列表
  - [x] AI 不可用时优雅降级（简单的追加模式 + 提示信息）

- **P1（应该实现）**
  - [x] 前端提供合并工作流的 UI（上传新文件 + 预览合并结果 + 确认保存）
  - [x] 合并结果预览面板，支持原始/合并后对比视图

- **P2（可选实现）**
  - [ ] 合并历史记录（每次合并都生成版本快照）
  - [ ] 支持批量合并多个文件到同一篇文章

---

## 3. 非目标 (Non-Goals)

> 明确排除边界，防止范围蔓延。

- ❌ 不支持非 Markdown 格式（Word、HTML、PDF 等）
- ❌ 不支持自动合并——所有合并结果必须经人工确认后才能保存
- ❌ 不支持多文件同时合并到一篇文章（单文件 → 单文章，P2 未来考虑）
- ❌ 不改变现有文章版本历史机制（版本快照由文章编辑功能统一管理）
- ❌ 不支持合并冲突的可视化编辑器——冲突信息以文字形式列在 changeHighlights 中

---

## 4. 设计方案 (Design)

### 4.1 架构概览

```
┌─────────────┐     FormData (file + articleId)      ┌──────────────────┐
│   Frontend  │ ───────────────────────────────────▶ │  /api/ai/merge   │
│  UploadZone │                                      │   (SSE stream)    │
│  + Preview  │ ◀──── SSE events ────────────────── │                   │
└─────────────┘                                      └───────┬───────────┘
                                                            │
                                                    ┌───────▼───────────┐
                                                    │  mergeContentStream│
                                                    │  (lib/ai/merge.ts) │
                                                    └───────┬───────────┘
                                                            │
                                              ┌─────────────▼─────────────┐
                                              │  Anthropic Claude API     │
                                              │  Model: claude-sonnet-4   │
                                              │  System: MERGE_PROMPT     │
                                              │  User: existing + new     │
                                              └───────────────────────────┘
```

**数据流说明：**
1. 前端通过 FormData 上传 `.md` 文件 + 目标文章 ID
2. API 端点验证权限、文件类型/大小、文章存在性
3. 从数据库读取现有文章内容
4. 调用 `mergeContentStream()` —— 这是一个 AsyncGenerator，通过 SSE 逐步 yield 进度事件
5. 前端通过 EventSource / ReadableStream 消费 SSE 事件，实时更新 UI

### 4.2 路由设计

| 路由 | HTTP 方法 | 说明 | 鉴权 |
|------|-----------|------|------|
| `/api/ai/merge` | `POST` | 上传新 .md 文件合并到现有文章（SSE 流式响应） | Admin（JWT Session） |

### 4.3 API 设计

#### `POST /api/ai/merge`

**请求：**
```
Content-Type: multipart/form-data

字段：
  file: File          # .md 或 .markdown 文件，最大 5MB
  articleId: string   # 目标文章的数字 ID
```

**响应（SSE 流）：**
```
Content-Type: text/event-stream

event: progress
data: {"step":"analyzing","message":"Analyzing existing article and new content..."}

event: progress
data: {"step":"calling_ai","message":"Calling AI to merge content..."}

event: progress
data: {"step":"processing_response","message":"Processing merge result..."}

event: complete
data: {"result":{"mergedContent":"...","summary":"...","changeHighlights":["..."]}}

--- 或错误情况 ---

event: error
data: {"message":"AI merge response invalid"}
```

**合并结果数据结构（`AIMergeResponse`）：**
```typescript
interface AIMergeResponse {
  mergedContent: string;          // 合并后的完整 Markdown 文章
  summary: string;                // 一句话描述做了什么变更
  changeHighlights: string[];     // 变更点列表（去重、插入位置、冲突标记等）
}
```

**安全校验（在 API 层）：**
| 校验项 | 失败时返回 |
|--------|-----------|
| JWT Session 验证 | 401 Unauthorized |
| 文件非空且为 File 实例 | 400 "No file provided" |
| articleId 非空且为字符串 | 400 "Article ID is required" |
| 文件扩展名为 .md 或 .markdown | 400 "Only .md files are supported" |
| 文件大小 ≤ 5MB | 400 "File too large. Maximum size is 5MB." |
| 目标文章存在于数据库 | 404 "Article not found" |

### 4.4 AI 交互设计

**System Prompt（`MERGE_SYSTEM_PROMPT`）：**
```
You are an expert technical writer. Your task is to intelligently merge
new content into an existing article.

Guidelines:
- Read the existing article and the new content carefully
- Insert new content at the most logically appropriate position
- Remove duplicate information — keep the better version
- If the new content contradicts the existing article, flag it
- Maintain consistent formatting, tone, and structure
- Keep all existing sections unless explicitly replaced
```

**User Prompt 结构：**
```markdown
## Existing Article
{existingContent}

## New Content to Merge
{newContent}

Please merge the new content into the existing article...
```

**模型与参数：**
| 参数 | 值 | 理由 |
|------|-----|------|
| 模型 | `claude-sonnet-4-20250514` | 文本处理任务，Sonnet 性价比最优 |
| max_tokens | 8192 | 容纳长文章的合并结果 |
| temperature | 0.3 | 需要结构化 JSON 输出 + 适度灵活性 |
| stream | true | SSE 流式返回进度 |

**输出解析策略：**
1. 收集所有 streaming chunk 拼接为完整文本
2. 使用正则 `/\{[\s\S]*\}/` 提取 JSON 块（兼容 Claude 偶尔在 JSON 外输出额外文本）
3. Zod schema 校验：`aiMergeResponseSchema`（`mergedContent`、`summary`、`changeHighlights` 三字段，均为必填）
4. 校验失败 → 降级为 `fallbackMerge()`（简单追加 + 提示）

**降级策略（`fallbackMerge`）：**
```typescript
// 当 API Key 未配置 或 AI 调用失败 或 JSON 解析失败时：
function fallbackMerge(existing, newContent): AIMergeResponse {
  return {
    mergedContent: `${existing}\n\n---\n\n## Added Content\n\n${newContent}`,
    summary: "New content appended (AI was unavailable for smart merge)",
    changeHighlights: ["New content appended to end of article"],
  };
}
```

### 4.5 组件设计

```
AIPreviewPanel（已有组件，需扩展以支持 merge 模式）
├── 模式切换：Process / Merge
├── Merge 模式 UI：
│   ├── 目标文章选择器（下拉搜索现有文章）
│   ├── UploadZone（复用现有组件）
│   └── 合并结果预览
│       ├── 合并后内容渲染（MarkdownRenderer）
│       ├── 变更摘要（summary）
│       └── 变更高亮列表（changeHighlights）
```

**AIPreviewPanel 新增 Props：**
```typescript
interface AIPreviewPanelProps {
  // 已有 Props...
  mode?: "process" | "merge";  // 新增：处理模式
  // merge 模式专用：
  targetArticleId?: number;
  mergeResult?: AIMergeResponse | null;
  onMergeComplete?: (result: AIMergeResponse) => void;
}
```

---

## 5. 用户流程 (User Flows)

### 主流程

1. 管理员进入管理后台，打开 AI 面板，切换到 **Merge 模式**
2. 从下拉列表中选择一篇**目标文章**（搜索 + 选择已有文章）
3. 拖拽或点击上传一份新的 `.md` 文件到 UploadZone
4. 点击 **"开始合并"**
5. 实时看到处理进度：
   - "正在分析现有文章和新内容..."（analyzing）
   - "正在调用 AI 合并内容..."（calling_ai）
   - "正在处理合并结果..."（processing_response）
6. 合并完成后，并排预览：
   - 左侧：合并后的完整文章
   - 右侧：变更摘要 + 变更高亮列表
7. 管理员检查结果 → 确认保存（写入数据库） 或 手动编辑后再保存

### 分支流程

- **AI 不可用（无 API Key）：** 跳过 AI 调用，直接将新内容追加到文章末尾；摘要显示"AI 不可用，已简单追加"
- **目标文章不存在：** 前端下拉列表已过滤，后端双保险返回 404
- **文件非 .md：** 上传阶段即拦截，显示红色错误提示
- **文件过大（>5MB）：** UploadZone 拦截，显示"文件过大，最大 5MB"
- **用户在处理中关闭页面：** SSE 连接自动断开，服务端 AsyncGenerator 被垃圾回收（无状态保留）

### 空状态

- 无文章时：下拉列表为空，显示"暂无文章，请先创建文章"
- 无文件时：UploadZone 显示引导文案"拖拽 .md 文件到此处或点击上传"

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 上传 .txt 或其他非 .md 文件 | 400 错误 "Only .md files are supported" |
| 上传空文件 | 400 错误（文件内容为空字符串时由前端拦截） |
| 上传 >5MB 文件 | 400 错误 "File too large. Maximum size is 5MB." |
| 目标文章 ID 不存在 | 404 错误 "Article not found" |
| AI API Key 未配置 | 降级为 fallbackMerge（简单追加），正常返回 200 SSE |
| AI 返回非 JSON 格式 | 正则匹配失败 → fallbackMerge 降级，不报错 |
| AI 返回的 JSON 不满足 Schema | Zod parse 失败 → fallbackMerge 降级 |
| AI API 超时（>60s） | catch 捕获 → SSE 发送 error 事件 |
| 网络中断（客户端断开 SSE） | ReadableStream 自动取消，服务端 AsyncGenerator 中止 |
| 并发对同一文章发起两次 merge | 允许并发执行（无锁），每次生成独立结果——但只有最后一次"确认保存"会生效 |
| 新内容与现有内容完全相同 | AI 应检测到 100% 重复，summary 返回 "No new content to merge"（由 Prompt 语义引导，非硬编码） |

---

## 7. 安全考量 (Security)

- [x] **JWT 鉴权：** 非管理员（无有效 JWT Session）无法调用 `/api/ai/merge`
- [x] **文件类型白名单：** 仅允许 `.md` 和 `.markdown` 扩展名
- [x] **文件大小限制：** 5MB 硬限制，防止内存耗尽
- [x] **AI API Key 服务端隔离：** Anthropic API Key 仅存储在 `.env.local`，前端无法访问
- [x] **不存储未确认的合并结果：** SSE 流的中间结果仅存在于内存，不持久化
- [x] **SQL 注入防护：** 使用 Drizzle ORM 参数化查询，`eq(articles.id, parseInt(articleId))` 防止注入

---

## 8. 性能考量 (Performance)

- [x] **SSE 流式响应：** 首字节时间 < 200ms（analyzing 事件立即发送）
- [x] **AsyncGenerator：** 非阻塞式 yield，不会阻塞 Node.js 事件循环
- [x] **文件大小限制：** 5MB 限制了 AI API 调用的 token 消耗上限
- [x] **读文件内容：** `await file.text()` 将整个文件读入内存——对于 ≤5MB 的 Markdown 文件足够
- [x] **无额外数据库查询：** 只做一次 `articles` 表查询获取现有文章
- [ ] 未实现：合并结果缓存（相同 existing+new 组合不重复调用 AI）

---

## 9. 可访问性 (Accessibility)

- [x] UploadZone 支持键盘操作（Enter/Space 触发文件选择，复用现有组件）
- [x] 处理进度通过 `role="status"` + `aria-live="polite"` 区域播报
- [x] 错误提示与 UploadZone 通过 `aria-describedby` 关联
- [x] 合并完成后，变更高亮列表使用语义化 `<ul>` 列表

---

## 10. 实现计划 (Implementation Plan)

### Step 1: 后端 — AI 合并核心逻辑

- **内容：** 实现 `mergeContent()` 和 `mergeContentStream()` 两个函数，包含 AI 调用、JSON 解析、Schema 验证、降级策略
- **文件：**
  - `src/lib/ai/prompts.ts`（新增 `MERGE_SYSTEM_PROMPT` 和 `buildMergePrompt`）
  - `src/lib/ai/types.ts`（新增 `aiMergeResponseSchema` 和 `AIMergeResponse` 类型）
  - `src/lib/ai/merge.ts`（新增文件，核心合并逻辑）
- **完成标准：**
  - `mergeContent()` 单元测试通过（Mock Claude API）
  - `mergeContentStream()` 单元测试通过（验证每个 yield 事件）
  - fallbackMerge 降级测试通过

### Step 2: API 端点

- **内容：** 创建 `POST /api/ai/merge` SSE 端点，处理 FormData 上传、权限校验、文件校验、调用 mergeContentStream
- **文件：** `src/app/api/ai/merge/route.ts`
- **完成标准：**
  - 集成测试通过：正常上传 → SSE 流返回进度 → 返回完整合并结果
  - 集成测试通过：无权限 → 401
  - 集成测试通过：非 .md 文件 → 400
  - 集成测试通过：超大文件 → 400
  - 集成测试通过：AI 不可用降级 → 200 + fallback 结果

### Step 3: 前端 — AIPreviewPanel 扩展

- **内容：** 扩展 `AIPreviewPanel` 组件支持 merge 模式，添加目标文章选择器、合并按钮、结果预览
- **文件：**
  - `src/components/admin/AIPreviewPanel.tsx`（修改现有文件）
  - `src/hooks/useAIStream.ts`（扩展以支持 merge 端点）
- **完成标准：**
  - 可切换到 Merge 模式
  - 可选择目标文章
  - 可上传文件并触发合并
  - 进度条实时显示
  - 合并结果在预览面板正确渲染

---

## 11. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | `fallbackMerge()` 降级输出正确性；`aiMergeResponseSchema.parse()` 对有效/无效输入的校验 |
| 集成测试 | API 端点：正常合并、401 鉴权失败、400 文件类型错误、400 文件大小超限、404 文章不存在、AI 不可用降级 |
| E2E 测试 | 完整流程：选择文章 → 上传文件 → 查看进度 → 查看合并结果 → 确认保存 |
| 手动测试 | 上传含特殊字符的 Markdown；上传超大文件（4.9MB）；网络中断恢复；并发合并 |

---

## 12. 回滚计划 (Rollback Plan)

- 该功能以新增 API 端点 + 新增 lib 模块的方式实现，**不修改现有代码路径**
- `POST /api/ai/process`（现有 AI 处理端点）完全不受影响
- 如需回滚：移除 `/api/ai/merge` 路由文件和 `src/lib/ai/merge.ts` 即可
- AIPreviewPanel 的 merge 模式通过 `mode` prop 控制，默认值为 `"process"`（保持向后兼容）

---

## 13. Review 记录

| 日期 | Reviewer | 结论 | 备注 |
|------|----------|------|------|
| 2026-07-10 | （自检） | Approved | 设计清晰，边界明确 |

---

## 14. Checklist

### Pre-Implementation

- [x] 设计已通过评审
- [x] API 接口定义完整（请求/响应格式、SSE 事件类型、错误码）
- [x] 数据模型无需变更（复用现有 articles 表）
- [x] 边缘情况已覆盖（6 种场景）
- [x] 安全考量已确认（JWT、文件校验、API Key 隔离）
- [x] 可访问性需求已确认
- [x] 测试策略已明确
- [x] 依赖项已就绪（`@anthropic-ai/sdk` 已在项目中使用）

### Post-Implementation

- [x] 代码通过 Code Review
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成（含边缘情况）
- [ ] Spec 状态更新为 Done
- [ ] Spec 归档至 `specs/completed/`

---

> **设计决策记录（ADR）：**
> 1. **为什么用 AsyncGenerator 而非 ReadableStream 直接实现？** — AsyncGenerator 更易于单元测试（可逐个验证 yield 值），且将 AI 逻辑与 HTTP 传输层解耦。API 层负责将 Generator 的事件映射为 SSE 格式。
> 2. **为什么降级策略选择"简单追加"而非"拒绝操作"？** — 优先保障可用性。AI 不可用时管理员仍然可以完成基本操作（追加内容），然后手动编辑。用户体验优于纯粹的技术正确性。
> 3. **为什么不做合并冲突可视化编辑器？** — 复杂度高（需要 diff 算法、行级对比 UI），列为 Non-Goal 由后续 Spec 单独处理。
