# Specs 生成提示词

> 用法：复制本文全部内容，将末尾的 `{你的项目需求}` 替换为实际需求描述，发送给 AI。

---

## 提示词正文

```
你是一个技术规格专家。请根据下面的项目需求，生成一套完整的 specs 文件。

## 项目需求

{在这里粘贴你的需求描述——可以是一段话，也可以是一份完整的需求文档}

---

## 输出要求

请按照 agenthub specs 规范，生成以下文件结构和内容。每个文件用代码块包裹，标注文件路径。

### 输出结构

specs/
├── overview/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── status.yaml
├── {module-1}/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── status.yaml
├── {module-2}/
│   └── ...
└── {module-N}/

---

## 规范要求

### 0. 模块划分原则

从需求中分析数据流，按"层"划分模块。典型顺序：
overview → database → api → {中间层} → {业务层} → {集成层}

每个后续模块的 status.yaml 必须声明 depends_on: 上一个模块名。
模块数量控制在 4-8 个。

### 1. requirements.md 格式

必须使用 EARS 格式。每个需求条目包含 5 个维度：

- **End**：用户/系统要达到什么目标（一句话）
- **Approach**：用什么技术手段实现（要具体到接口/方法级别）
- **Rule**：必须遵守的规则（字段长度、枚举值、业务规则）
- **Constraint**：外部限制（分页默认值、超时时间、性能上限）
- **Acceptance**：可验证的验收条件（`- [ ]` 复选框格式，≥3 条）

编号规则：取模块名首字母 + R + 序号（如 DR1, AR1, SR1）。

文件末尾必须有一个验收标准汇总表：

| 验收项 | 关联需求 | 状态 |
|--------|----------|------|
| xxx | DR1 | [ ] |

### 2. design.md 格式

必须包含：
- **技术决策表**：决策项 | 选择 | 理由
- **架构图**：Mermaid 格式（graph/erDiagram/sequenceDiagram）
- **目录结构/包结构**：完整到文件级别
- **数据模型**：如果本模块涉及数据库，给出完整 DDL 和实体映射
- **接口设计**：如果本模块涉及 API，给出请求/响应示例（JSON 格式）
- **关键实现细节**：算法思路、状态机、处理流程

### 3. tasks.md 格式

- 拆解到**文件级别**（一个任务 = 一个文件/一个完整小功能）
- 使用 `- [ ]` 复选框格式
- 编号格式：`{模块缩写}{序号} {描述}`，如 `DB1.0 Conversation 实体类`
- 按依赖关系排序（先基础后上层）
- 如果有跨模块的 Phase 编排，在 overview/tasks.md 中列出来

### 4. status.yaml 格式

```yaml
stage: overview          # overview 或 module
module: {模块名}          # 仅 module 级别需要
status: draft            # draft | in_progress | done
approved_by: ""
last_update: {日期}
depends_on: {依赖模块名}   # 仅 module 级别需要
execution_summary: |     # 仅 module 级别需要，与 tasks.md 中的任务一一对应
  XX1.0 xxx - TODO
  XX2.0 xxx - TODO
```

### 5. 全局约束

- 所有任务初始状态为 `[ ]`（未完成）或 `TODO`
- 所有验收条件初始状态为 `[ ]`
- status.yaml 初始 status 为 `draft`
- 不要编造代码实现细节——只写到接口/DDL/伪代码级别
- 需求编号全局唯一（DR1, DR2, AR1, AR2...）
- 文件末尾统一附 status yaml 代码块
```
