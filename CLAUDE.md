# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FixBug Studio is a personal blog website with an app portal, built on an **AI Agent-driven architecture**. The frontend is primarily a conversational intent input box; the backend exposes all functionality as AI-callable Tools. Traditional page routes are retained as a fallback when AI is unavailable.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (full-stack) |
| Backend | Node.js + Fastify |
| Frontend | Next.js (App Router) |
| Database | SQLite via Drizzle ORM |
| AI SDK | **Vercel AI SDK** (`generateText` + `tool()` + `maxSteps` for multi-step tool calling) |
| AI Models | **Anthropic Claude** (Haiku for intent classification + simple ops, Sonnet for complex planning; Opus optional P3). **OpenAI GPT-4o-mini** as cost-saving fallback. |
| Agent Framework | **Self-built lightweight agent** on top of AI SDK — no LangChain. See Q11 in REQUIREMENTS.md for rationale. |
| Styling | Tailwind CSS |
| Markdown | unified + remark + rehype |
| Deployment | Docker + Nginx + Let's Encrypt |

## Architecture: AI Agent-Driven

```
User Input (natural language)
  → AI Agent Layer (/api/chat)
    → Intent classification (Haiku)
    → Task planning & tool orchestration (Sonnet for complex)
    → Tool execution (single unified Tool Registry)
      → Business logic + Drizzle ORM → SQLite
    → Response (text stream + confirmation cards + result cards)
```

### Core Principles

1. **Tools are the single source of truth for capabilities.** Both AI and traditional REST calls go through the same Tool Registry with the same auth and validation.
2. **Tool-layer auth is mandatory.** Never trust AI output — every tool call independently verifies the caller's identity and permissions.
3. **Destructive operations always require confirmation cards.** AI generates a structured confirmation card; the user must explicitly approve before the tool executes.
4. **Passwords/credentials never pass through the AI model.** Login/register use hybrid mode: AI guides the user to a lightweight traditional form that POSTs directly to the tool layer.
5. **Degradation is automatic.** If the AI API fails 3 consecutive times, the frontend switches to traditional navigation + forms. Tools continue working. AI health is probed every 30s for auto-recovery.

## Requirements & Key Decisions

- **REQUIREMENTS.md v2.0** is the authoritative spec. Reference tool IDs (T-01~T-35) and requirement IDs (NF-20~NF-36 for AI-specific).
- All 17 key decisions (Q1-Q17) are recorded in §9 of REQUIREMENTS.md. New AI-specific decisions: Q11 (AI SDK), Q12 (model provider), Q13 (degradation), Q14 (session persistence), Q15 (confirmation cards), Q16 (model routing), Q17 (Zod tool schemas).
- Tag-based article classification. Comments post directly, moderated after the fact. Email deferred (P3). RBAC: guest/user/admin.

## Data Model (Drizzle/SQLite)

Core entities: **User**, **Article**, **Comment** (self-referencing parent_id), **Like** (unique on article_id+user_id), **AppEntry**, **SiteConfig**, **AIAuditLog** (trace_id, user_intent, agent_plan, tool_calls, tokens_used, cost_estimate), **ChatSession** (messages JSON, context JSON).

Each tool maps to one or more of these entities. Tool definitions (§3 of REQUIREMENTS.md) specify exact parameters, permissions, side effects, and confirmation requirements.

## Tool Registry Pattern

Every backend capability is registered as a tool with:
- **Zod schema** for parameters (provides runtime validation + TypeScript types + JSON Schema for AI)
- **Permission decorator** (`guest` / `user` / `admin`)
- **Side effect declaration** (`read` / `write` / `destroy`)
- **Confirmation requirement** (`never` / `always` / `conditional`)
- **Rate limit** (per-tool config)

See REQUIREMENTS.md §3.1 for the full tool definition schema and §3.2-§3.7 for all 35 tools.

## Route Plan (Dual Channel)

### AI Chat API
- `POST /api/chat` — send message, get AI response (JSON with tool results + confirmation cards)
- `POST /api/chat/stream` — same, SSE streaming (typewriter effect)
- `POST /api/chat/confirm` — respond to a confirmation card (confirm/cancel)
- `GET /api/chat/sessions` — list user's chat sessions

### Tool API (shared by AI + traditional UI)
- `GET/POST /api/tools/articles` — list / create articles
- `GET/PATCH/DELETE /api/tools/articles/:id` — article CRUD
- `POST /api/tools/articles/:id/publish` — publish
- `POST /api/tools/articles/upload` — upload .md file
- `GET/POST /api/tools/comments` — list / create comments
- `DELETE /api/tools/comments/:id` — delete comment
- `POST /api/tools/likes/:article_id` — toggle like
- `POST /api/tools/auth/register|login|logout` — auth (hybrid mode)
- `GET/PATCH /api/tools/users/profile` — user profile
- `GET/POST/PATCH/DELETE /api/tools/admin/*` — admin tools (all require admin)
- `GET/POST /api/tools/apps` — app portal entries

### Traditional Page Routes (fallback)
`/` `/articles` `/articles/[slug]` `/tags` `/tags/[tag]` `/search` `/login` `/register` `/user/profile` `/admin` `/admin/*` `/apps`

## Git Workflow

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`, `test:`, `perf:`
- **Branch naming**: `feature/name`, `fix/name`, `refactor/name`, `docs/name`, `chore/name`
- **PR-based merges to main**. Squash and merge preferred. PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` in commit messages.

## Build & Run Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Lint (when configured)
npm test         # Run tests (when configured)
```

## Phase Plan

- **Phase 1 (MVP)**: Tool Registry + all article/comment/like/user tools, AI Agent v1 (single-step tool calls, streaming), conversational input + traditional fallback dual-channel, Docker deploy
- **Phase 2**: Multi-step AI planning, context awareness, model routing (Haiku/Sonnet), confirmation cards, audit logs + cost dashboard, app portal tools
- **Phase 3**: Full conversational experience, auto-degradation/recovery, RSS, dark mode, GitHub OAuth, CDN, email services

When starting implementation, work from REQUIREMENTS.md §10 Phase 1 items (P0 tools + AI Agent v1 + dual-channel frontend).
