# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Current State: Documentation-Only (Greenfield)

**No source code exists yet.** This repository currently contains only planning documentation:
- `REQUIREMENTS.md` — authoritative spec (v2.0, ~930 lines, Chinese)
- `CLAUDE.md` — this file
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template
- `LICENSE` — MIT

There is no `package.json`, no `src/`, no `tsconfig.json`, no database — nothing has been scaffolded. The architecture below describes what WILL be built, not what exists. **The first implementation task is always to scaffold the project structure.**

## Prerequisites

- **Node.js** ≥ 20.x (LTS)
- **npm** ≥ 10.x
- **Git** (with SSH configured for GitHub — remote: `git@github.com:kuangxingye-design/FixBug-Studio.git`)

## Proposed Directory Structure (Monorepo)

```
FixBug-Studio/
├── packages/
│   ├── backend/           # Fastify server + AI Agent layer + Tool Registry
│   │   ├── src/
│   │   │   ├── server.ts          # Fastify entry point
│   │   │   ├── tools/             # Tool Registry + all tool implementations
│   │   │   ├── agent/             # AI Agent layer (intent, planning, orchestration)
│   │   │   ├── db/                # Drizzle ORM schema + migrations + connection
│   │   │   ├── middleware/        # Auth, rate limiting, error handling
│   │   │   └── lib/               # Shared utilities
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── frontend/          # Next.js App Router
│       ├── src/
│       │   └── app/               # App Router pages + layouts
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/
│       └── nginx.conf
├── REQUIREMENTS.md
├── package.json           # Root workspace config (npm workspaces)
└── tsconfig.json          # Root TypeScript config
```

If a monorepo feels too heavy for Phase 1, a single `src/` directory with `backend/` and `frontend/` subdirectories is an acceptable simpler alternative. The key constraint: backend and frontend share TypeScript types (tool schemas, API contracts).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (full-stack) |
| Backend | Node.js + Fastify |
| Frontend | Next.js (App Router) |
| Database | SQLite via Drizzle ORM |
| AI SDK | **Vercel AI SDK** (`generateText` + `tool()` + `maxSteps` for multi-step tool calling) |
| AI Models | **Anthropic Claude** (Haiku for intent classification + simple ops, Sonnet for complex planning; Opus optional P3). **OpenAI GPT-4o-mini** as cost-saving fallback. |
| Agent Framework | **Self-built lightweight agent** on top of AI SDK — no LangChain. See Q11 in REQUIREMENTS.md §9 for rationale. |
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
- All 17 key decisions (Q1-Q17) are recorded in REQUIREMENTS.md §9. Key AI-specific decisions: Q11 (AI SDK over LangChain), Q12 (Claude primary, OpenAI fallback), Q13 (auto-degradation), Q14 (DB-backed sessions), Q15 (server-generated confirmation cards), Q16 (Haiku/Sonnet routing), Q17 (Zod for tool schemas).
- Tag-based article classification. Comments post directly, moderated after the fact. Email deferred (P3). RBAC: guest/user/admin.

## Data Model (Drizzle/SQLite)

Core entities: **User**, **Article**, **Comment** (self-referencing parent_id), **Like** (unique on article_id+user_id), **AppEntry**, **SiteConfig**, **AIAuditLog** (trace_id, user_intent, agent_plan, tool_calls, tokens_used, cost_estimate), **ChatSession** (messages JSON, context JSON).

Full field definitions and relationships are in REQUIREMENTS.md §7. Each tool maps to one or more of these entities.

## Tool Registry Pattern

Every backend capability is registered as a tool with:
- **Zod schema** for parameters (provides runtime validation + TypeScript types + JSON Schema for AI)
- **Permission decorator** (`guest` / `user` / `admin`)
- **Side effect declaration** (`read` / `write` / `destroy`)
- **Confirmation requirement** (`never` / `always` / `conditional`)
- **Rate limit** (per-tool config)

See REQUIREMENTS.md §3.1 for the full tool definition schema and §3.2-§3.7 for all 35 tools (T-01 through T-35).

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

## Build & Run Commands

These commands are **planned** — they don't exist until the project is scaffolded:

```bash
npm run dev      # Start development server (backend + frontend concurrently)
npm run build    # Production build
npm run lint     # Lint (ESLint + Prettier)
npm test         # Run tests (Vitest)
```

Once scaffolded, use `npm workspaces` to run commands in individual packages:
```bash
npm -w packages/backend run dev
npm -w packages/frontend run dev
```

## Git Workflow

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`, `test:`, `perf:`
- **Branch naming**: `feature/name`, `fix/name`, `refactor/name`, `docs/name`, `chore/name`
- **PR-based merges to main**. Squash and merge preferred. PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` in commit messages.
- **Never force-push to main.** On feature branches, use `--force-with-lease` if needed.
- **Small, frequent commits** — don't batch unrelated changes. Each commit should be one logical change.
- After merging a PR, delete the remote branch (GitHub has a one-click button for this) and run `git branch -d feature/xxx` locally.
- If mid-work and need to switch tasks, use `git stash push -m "WIP: description"` rather than a rushed commit.

## Phase Plan & Implementation Order

### Phase 1 — MVP (current focus)
1. **Project scaffolding**: monorepo structure, TypeScript configs, package.json files, Fastify + Next.js boilerplate
2. **Database**: Drizzle ORM setup, schema for all 8 entities, initial migration
3. **Tool Registry**: Registry infrastructure + auth middleware + Zod schema patterns
4. **Core tools**: Article tools (T-01~T-11), Comment tools (T-12~T-15), Like tools (T-16~T-18), User/Auth tools (T-19~T-24)
5. **AI Agent v1**: Single-step tool calls, intent classification (Haiku), streaming responses
6. **Frontend**: Conversational input box + traditional article list/detail pages as fallback
7. **Admin tools**: T-25~T-31 (article management first)
8. **Degradation v1**: Failure detection + manual switch to traditional mode
9. **Docker deployment**: Dockerfile, docker-compose, nginx reverse proxy

### Phase 2 — AI Enhancement + App Portal
Multi-step planning, context awareness, model routing (Haiku/Sonnet), confirmation cards, audit logs + cost dashboard, app portal tools (T-32~T-35), tag filtering + full-text search, admin dashboard

### Phase 3 — Experience Polish
Full conversational experience, auto-degradation/recovery, RSS, dark mode, GitHub OAuth, CDN, email services

**When starting implementation, always begin with REQUIREMENTS.md §10 Phase 1 items. The first concrete step is scaffolding the monorepo structure.**
