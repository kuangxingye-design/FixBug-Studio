# Spec: AI 文档处理工作流

| 字段 | 值 |
|------|-----|
| **作者** | @kuang |
| **日期** | 2026-07-10 |
| **状态** | Done |
| **版本** | 1.0 |
| **关联 Spec** | 005-ai-document-merge（AI 文档合并 — 本功能的姊妹功能） |

---

## 1. 概述 (Overview)

管理员上传原始 .md 文件，由 Claude AI 自动转换为结构化、格式规范的知识文章。AI 分析内容后给出：优化后的正文、建议标题、标签、分类、摘要和阅读时间。整个过程通过 SSE（Server-Sent Events）流式返回进度，前端在边栏预览面板中实时展示。AI 不可用时优雅降级为原始内容直出。

**目标用户：** 博客管理员。适用于将笔记、草稿、外部文档快速转化为发布级文章。

---

## 2. 动机与目标 (Motivation & Goals)

### 动机

- 手动将零散笔记整理为结构化的博客文章耗时费力
- Markdown 格式、标题层级、段落组织、元数据填写等机械工作可通过 AI 自动化
- 降低写作门槛，让管理员专注于内容本身

### 目标

- **P0**
  - [x] 上传 .md 文件 → AI 自动处理 → 返回结构化文章
  - [x] SSE 流式返回进度：analyzing → calling_ai → processing_response → complete
  - [x] AI 返回结构化 JSON（processedContent + 建议标题/标签/分类/摘要/阅读时间）
  - [x] AI 不可用时降级（rawContent 原样返回 + 基本元数据提取）
  - [x] API 端点需要管理员鉴权

- **P1**
  - [x] 前端预览面板：原始内容 vs 处理后内容并排对照
  - [x] AI 参考已有分类和标签列表来给出建议
  - [x] 处理完成后自动重新计算阅读时间（基于 AI 输出内容而非原始内容）

- **P2**
  - [ ] AI 处理后自动保存为草稿
  - [ ] 支持自定义 AI Prompt（当前使用内置 Prompt）
  - [ ] 支持多语言输出

---

## 3. 非目标 (Non-Goals)

- ❌ 不支持非 Markdown 格式（Word、HTML、PDF）
- ❌ 不支持批量处理多文件
- ❌ AI 处理结果不会自动发布——必须人工确认
- ❌ 不支持用户自定义 System Prompt

---

## 4. 设计方案 (Design)

### 4.1 架构概览

```
┌─────────────────┐   FormData (.md file)     ┌──────────────────────┐
│   UploadZone     │ ────────────────────────▶ │ POST /api/ai/process │
│   (拖拽上传)      │                           │   (SSE stream)       │
│                  │ ◀── SSE events ────────── │                      │
│ ProcessingStatus │                           │ 1. 读取 .md 内容     │
│   (进度展示)      │                           │ 2. 查 DB 获取分类/标签│
│                  │                           │ 3. 构建 Prompt       │
│ AIPreviewPanel   │                           │ 4. 调用 Claude       │
│   (结果预览)      │                           │ 5. 流式返回进度+结果  │
└─────────────────┘                           └──────┬───────────────┘
                                                     │
                                             ┌───────▼───────────────┐
                                             │  processMarkdownStream │
                                             │  (lib/ai/process.ts)  │
                                             │  AsyncGenerator        │
                                             └───────┬───────────────┘
                                                     │
                                             ┌───────▼───────────────┐
                                             │  Anthropic Claude API │
                                             │  Model: sonnet-4      │
                                             │  System: PROCESS_PROMPT│
                                             └───────────────────────┘
```

### 4.2 API 设计

#### `POST /api/ai/process`

**请求：**
```
Content-Type: multipart/form-data
字段：file: File  (.md 或 .markdown，最大 5MB)
```

**响应（SSE 流）：**
```
Content-Type: text/event-stream

event: progress
data: {"step":"analyzing","message":"Analyzing content structure..."}

event: progress
data: {"step":"calling_ai","message":"Calling AI to transform your content..."}

event: progress
data: {"step":"processing_response","message":"Processing AI response..."}

event: complete
data: {"result":{
  "processedContent":"# 结构化文章\n\n...",
  "suggestedTitle":"文章标题",
  "suggestedTags":["tag1","tag2"],
  "suggestedCategory":"分类名",
  "suggestedExcerpt":"摘要...",
  "estimatedReadingTime":5
}}

--- 错误情况 ---

event: error
data: {"message":"AI response did not contain valid JSON"}
```

**SSE 事件类型（TypeScript）：**
```typescript
// src/lib/ai/types.ts
type AIProgressStep = "analyzing" | "calling_ai" | "processing_response" | "complete" | "error";

type StreamEvent =
  | { type: "progress"; step: string; message: string }
  | { type: "complete"; result: AIProcessResponse }
  | { type: "error"; message: string };
```

**处理结果（AIProcessResponse）：**
```typescript
// Zod validated
interface AIProcessResponse {
  processedContent: string;     // 结构化后的完整 Markdown
  suggestedTitle: string;       // ≤200 字符
  suggestedTags: string[];      // 1-8 个标签
  suggestedCategory: string;    // 分类名
  suggestedExcerpt: string;     // ≤500 字符
  estimatedReadingTime: number; // 分钟（由服务端基于 processedContent 重新计算）
}
```

### 4.3 AI 交互设计

**System Prompt（`PROCESS_SYSTEM_PROMPT`）：**
```
You are an expert technical writer and knowledge organizer. Your task is to
transform rough markdown notes into a well-structured, readable knowledge article.

Guidelines:
- Identify the core topic and create a clear, descriptive title
- Reorganize fragmented notes into logical, flowing sections
- Add transitional sentences between sections for coherence
- Remove redundant or repeated information
- Preserve ALL code blocks, tables, technical terms exactly as written
- Maintain the original author's voice and technical depth
- Use proper Markdown formatting
- Suggest relevant tags (up to 8) and a category
- Write a concise excerpt (under 500 characters)
- Estimate reading time

CRITICAL: Respond with ONLY a valid JSON object (no markdown fences).
```

**User Prompt 结构（`buildProcessPrompt`）：**
```markdown
## Raw Markdown Content
{rawContent}

## Available Categories
{existingCategoryNames}

## Existing Tags
{existingTagNames}

Please transform this content into a well-structured knowledge article.
```

**模型参数：**
| 参数 | 值 | 理由 |
|------|-----|------|
| model | `claude-sonnet-4-20250514` | 文本处理性价比最优 |
| max_tokens | 8192 | 容纳长文章输出 |
| temperature | 0.3 | 结构化输出需要低温度 |
| stream | true | SSE 流式返回 |

### 4.4 降级策略（`fallbackProcess`）

当 `ANTHROPIC_API_KEY` 未配置或 AI 调用失败时：

```typescript
function fallbackProcess(rawContent: string): AIProcessResponse {
  const firstLine = rawContent.trim().split("\n")[0].replace(/^#+\s*/, "");
  return {
    processedContent: rawContent,    // 原样返回
    suggestedTitle: firstLine || "Untitled Article",
    suggestedTags: ["untagged"],
    suggestedCategory: "Notes",
    suggestedExcerpt: rawContent.substring(0, 200).trim(),
    estimatedReadingTime: calculateReadingTime(rawContent),
  };
}
```

### 4.5 关键设计决策

**为什么阅读时间由服务端重新计算而非直接使用 AI 返回值？**
AI 的阅读时间估算基于 token 计数，可能不准确。服务端在拿到 `processedContent` 后调用 `calculateReadingTime()` 重新计算，确保一致性。

**为什么要把已有分类和标签传给 AI？**
AI 在建议分类和标签时，如果知道已有的分类/标签列表，可以优先建议复用已有的（降低碎片化），或者明确建议新增的（此时前端可提示管理员同步创建）。

**为什么用 AsyncGenerator 而非直接在 API Route 中调用？**
解耦 AI 逻辑和 HTTP 传输层。`processMarkdownStream()` 是纯逻辑函数，可独立单元测试。API Route 只负责将 Generator 的 yield 事件映射为 SSE 格式。

---

## 5. 用户流程 (User Flows)

### 主流程

1. 管理员进入管理后台，打开 AI 面板（默认 Process 模式）
2. 将 .md 文件拖入 UploadZone 区域
3. 点击"开始 AI 处理"
4. ProcessingStatus 组件显示三步进度：
   - "正在分析内容结构..."（analyzing）
   - "正在调用 AI 转换内容..."（calling_ai）
   - "正在处理 AI 响应..."（processing_response）
5. 处理完成后，AIPreviewPanel 展示：
   - 左侧：AI 优化后的文章（Markdown 渲染）
   - 右侧：建议的元数据（标题、分类、标签、摘要、阅读时间）
6. 管理员可切换到"原始内容"视图进行对照
7. 确认无误 → 点击"保存为文章" → 跳转到文章编辑页（数据已预填充）

### 分支流程

- **AI 不可用：** 跳过 AI 调用，返回降级结果。进度显示 "AI unavailable — using raw content as-is"
- **AI 返回非 JSON：** 正则匹配失败 → SSE 发送 error 事件 → 降级
- **文件过大（>5MB）：** UploadZone 或 API 层拦截，显示错误提示
- **文件非 .md：** UploadZone accept 属性过滤 + API 层二次校验

---

## 6. 边缘情况与错误处理 (Edge Cases)

| 场景 | 预期行为 |
|------|----------|
| 上传空文件 | 前端拦截（file.size === 0），阻止提交 |
| 上传 >5MB 文件 | API 返回 400 "File too large. Maximum size is 5MB." |
| 上传非 .md 文件 | API 返回 400 "Only .md files are supported" |
| AI API Key 未配置 | `getAnthropicClient()` 返回 null → fallbackProcess() |
| AI 返回中无 JSON | 正则 `/\{[\s\S]*\}/` 匹配失败 → fallbackProcess() |
| AI 返回 JSON 不满足 Schema | Zod parse 失败 → catch → fallbackProcess() |
| AI API 调用超时 | catch 捕获 → SSE error 事件 |
| 客户端断开（关闭页面） | ReadableStream 自动取消，Generator 停止 |
| 数据库中无分类/标签 | Prompt 中显示 "(none — suggest new ones)" |

---

## 7. 安全考量 (Security)

- [x] JWT 鉴权：仅管理员可调用 `/api/ai/process`
- [x] Anthropic API Key 仅在服务端使用，前端无感知
- [x] 文件类型和大小校验（API 层白名单 + 大小限制）
- [x] 用户上传的 Markdown 内容不做 SQL 注入（通过参数化查询）
- [x] AI 返回内容经过 Zod 校验后才返回前端

---

## 8. 实现计划 (Implementation Plan)

### Step 1: AI 基础设施

- `src/lib/ai/client.ts` — Anthropic 客户端单例封装
- `src/lib/ai/types.ts` — Zod Schema + TypeScript 类型
- `src/lib/ai/prompts.ts` — System Prompt + User Prompt 构建函数

### Step 2: AI 处理逻辑

- `src/lib/ai/process.ts` — `processMarkdown()` + `processMarkdownStream()` + `fallbackProcess()`

### Step 3: API 端点

- `src/app/api/ai/process/route.ts` — SSE 端点：接收 FormData → 校验 → 调 processMarkdownStream → 映射为 SSE 事件

### Step 4: 前端组件

- `src/components/admin/UploadZone.tsx` — 拖拽/点击上传
- `src/components/admin/ProcessingStatus.tsx` — SSE 进度展示
- `src/components/admin/AIPreviewPanel.tsx` — 原始/处理后对照视图
- `src/components/admin/AIOptionsPanel.tsx` — AI 面板控制
- `src/hooks/useAIStream.ts` — SSE 流消费 Hook

---

## 9. 测试策略 (Testing Strategy)

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | `fallbackProcess()` 降级输出正确性；`aiProcessResponseSchema` 校验；Prompt 构建函数 |
| 集成测试 | Mock Claude API：正常处理 → SSE 流正确；AI 不可用降级；文件类型/大小拦截 |
| 手动测试 | 上传真实 .md 文件验证 AI 处理质量；网络断开时的前端表现；特殊字符和长文处理 |

---

## 10. Checklist

### Pre-Implementation

- [x] 确定 Anthropic SDK (@anthropic-ai/sdk ^0.39.0)
- [x] 确定模型：claude-sonnet-4-20250514
- [x] 确定 System Prompt 内容
- [x] 确定降级策略：fallbackProcess
- [x] 确定 SSE 事件类型：progress / complete / error

### Post-Implementation

- [x] AI 处理流程跑通（含实时进度）
- [x] 降级策略生效（无 API Key 场景）
- [x] 预览面板正确展示处理结果
- [x] 文件校验生效（类型 + 大小）
- [x] Zod Schema 校验拦截异常 AI 输出
