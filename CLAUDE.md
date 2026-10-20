# AI-Powered Personal Blog

A personal blog/knowledge-base website with AI-assisted document processing.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Styling**: Tailwind CSS 3 + @tailwindcss/typography
- **AI**: Anthropic Claude API (Sonnet model)
- **Auth**: Custom JWT-based session with httpOnly cookies

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment: copy `.env.example` to `.env.local` and configure `ANTHROPIC_API_KEY`
3. Run database migration: `npm run db:migrate`
4. Seed the database: `npm run db:seed`
5. Start dev server: `npm run dev`

Default admin credentials (from seed):
- Email: `admin@blog.local`
- Password: `admin123`

## Project Structure

```
src/
├── app/
│   ├── (public)/       # Public blog pages (Header + Footer layout)
│   ├── admin/          # Admin dashboard (authenticated)
│   ├── api/            # API Route Handlers
│   ├── rss.xml/        # RSS feed
│   └── sitemap.xml/    # Sitemap generator
├── components/
│   ├── ui/             # Primitive UI components
│   ├── layout/         # Header, Footer, Sidebar
│   ├── articles/       # ArticleCard, TOC
│   ├── comments/       # CommentSection, CommentForm
│   ├── admin/          # Admin-specific components
│   └── shared/         # MarkdownRenderer, Pagination
├── lib/
│   ├── db/             # Database connection, schema, seed
│   ├── ai/             # AI client, prompts, process, merge
│   ├── auth/           # Session, password hashing
│   ├── markdown/       # Markdown rendering, TOC extraction
│   ├── search/         # FTS5 full-text search
│   ├── rss/            # RSS feed generator
│   └── utils/          # slugify, date, reading-time, validators
├── hooks/              # Custom React hooks
├── providers/          # ThemeProvider
└── types/              # Shared TypeScript types
```

## Key Features

### AI Document Processing
- Upload raw .md files → Claude AI transforms into structured articles
- SSE streaming for real-time progress updates
- Side-by-side preview (raw vs processed)
- AI suggests: title, tags, category, excerpt, reading time
- Merge workflow: upload additional .md to merge into existing articles

### Admin Dashboard
- Article CRUD with Markdown editor and live preview
- Version history (full snapshots on each edit)
- Category and tag management
- Comment moderation (approve/reject)
- Media library (image upload)
- Site settings (blog name, SEO, social links, comments toggle)

### Public Blog
- Homepage with featured articles
- Article list with pagination, search, filters
- Article detail with TOC sidebar
- Category and tag browsing
- Archive by year/month
- Full-text search (SQLite FTS5)
- RSS feed and Sitemap
- Dark mode support
- Responsive design

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run lint` — Run ESLint
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:migrate` — Run database migrations + set up FTS5
- `npm run db:seed` — Seed database with sample data
- `npm run db:studio` — Open Drizzle Studio
