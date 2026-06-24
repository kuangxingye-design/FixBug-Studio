import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DB_PATH || "./data/fixbug-studio.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = bcrypt.hashSync("admin123", 10);
  const existingAdmin = sqlite
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@fixbug.studio");

  if (!existingAdmin) {
    sqlite
      .prepare(
        `INSERT INTO users (email, password_hash, nickname, role, bio, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`
      )
      .run(
        "admin@fixbug.studio",
        passwordHash,
        "Admin",
        "admin",
        "FixBug Studio 站长"
      );
    console.log("  ✓ Admin user created (admin@fixbug.studio / admin123)");
  } else {
    console.log("  - Admin user already exists, skipped");
  }

  // Create sample articles
  const adminUser = sqlite
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@fixbug.studio") as { id: number };

  const existingArticle = sqlite
    .prepare("SELECT id FROM articles WHERE slug = ?")
    .get("hello-world");

  if (!existingArticle) {
    sqlite
      .prepare(
        `INSERT INTO articles (title, slug, summary, content, content_html, status, author_id, tags, published_at, created_at, updated_at, view_count, like_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch(), ?, ?)`
      )
      .run(
        "欢迎来到 FixBug Studio",
        "hello-world",
        "这是 FixBug Studio 的第一篇文章，介绍这个 AI 驱动的个人博客平台。",
        `# 欢迎来到 FixBug Studio 🚀

FixBug Studio 是一个 **AI Agent 驱动**的个人博客平台。

## 核心理念

- 🗣️ **对话式交互**：用自然语言管理你的博客
- 🛠️ **工具化架构**：所有功能以 Tools 形式暴露给 AI
- 🔒 **安全第一**：密码等敏感信息不经过 AI 模型
- 📱 **响应式设计**：桌面端和移动端都有良好体验

## 开始使用

试着在对话框中输入以下指令：

- "帮我发布一篇文章"
- "搜索关于 Rust 的文章"
- "查看网站数据"

Enjoy! 🎉`,
        '<h1>欢迎来到 FixBug Studio 🚀</h1><p>FixBug Studio 是一个 <strong>AI Agent 驱动</strong>的个人博客平台。</p><h2>核心理念</h2><ul><li>🗣️ <strong>对话式交互</strong>：用自然语言管理你的博客</li><li>🛠️ <strong>工具化架构</strong>：所有功能以 Tools 形式暴露给 AI</li><li>🔒 <strong>安全第一</strong>：密码等敏感信息不经过 AI 模型</li><li>📱 <strong>响应式设计</strong>：桌面端和移动端都有良好体验</li></ul><h2>开始使用</h2><p>试着在对话框中输入以下指令：</p><ul><li>"帮我发布一篇文章"</li><li>"搜索关于 Rust 的文章"</li><li>"查看网站数据"</li></ul><p>Enjoy! 🎉</p>',
        "published",
        adminUser.id,
        JSON.stringify(["博客", "公告"]),
        42,
        5
      );
    console.log('  ✓ Sample article "欢迎来到 FixBug Studio" created');
  } else {
    console.log("  - Sample article already exists, skipped");
  }

  // Create second article
  const existingArticle2 = sqlite
    .prepare("SELECT id FROM articles WHERE slug = ?")
    .get("rust-async-basics");

  if (!existingArticle2) {
    sqlite
      .prepare(
        `INSERT INTO articles (title, slug, summary, content, content_html, status, author_id, tags, published_at, created_at, updated_at, view_count, like_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch(), ?, ?)`
      )
      .run(
        "Rust 异步编程入门",
        "rust-async-basics",
        "从基础概念到实战，全面了解 Rust 异步编程的核心知识。",
        `# Rust 异步编程入门

## 什么是异步编程？

异步编程允许程序在等待 I/O 操作时执行其他任务，而不是阻塞等待。

## Rust 中的异步模型

Rust 使用 \`async\`/\`await\` 语法，配合 \`Future\` trait 实现异步编程。

\`\`\`rust
async fn fetch_data() -> Result<String, Error> {
    let response = reqwest::get("https://api.example.com/data").await?;
    let body = response.text().await?;
    Ok(body)
}
\`\`\`

## 常用运行时

- **Tokio**：最流行的异步运行时
- **async-std**：与标准库 API 相似的异步运行时
- **smol**：轻量级异步运行时

## 总结

Rust 的异步编程模型提供了零成本抽象，在性能关键场景中表现优异。`,
        '<h1>Rust 异步编程入门</h1><h2>什么是异步编程？</h2><p>异步编程允许程序在等待 I/O 操作时执行其他任务，而不是阻塞等待。</p><h2>Rust 中的异步模型</h2><p>Rust 使用 <code>async</code>/<code>await</code> 语法，配合 <code>Future</code> trait 实现异步编程。</p><pre><code class="language-rust">async fn fetch_data() -> Result<String, Error> {\n    let response = reqwest::get("https://api.example.com/data").await?;\n    let body = response.text().await?;\n    Ok(body)\n}</code></pre><h2>常用运行时</h2><ul><li><strong>Tokio</strong>：最流行的异步运行时</li><li><strong>async-std</strong>：与标准库 API 相似的异步运行时</li><li><strong>smol</strong>：轻量级异步运行时</li></ul><h2>总结</h2><p>Rust 的异步编程模型提供了零成本抽象，在性能关键场景中表现优异。</p>',
        "published",
        adminUser.id,
        JSON.stringify(["Rust", "异步编程"]),
        128,
        12
      );
    console.log('  ✓ Sample article "Rust 异步编程入门" created');
  } else {
    console.log("  - Sample article 2 already exists, skipped");
  }

  // Insert default site configs
  const configs = [
    ["site_name", "FixBug Studio"],
    ["site_description", "AI Agent 驱动的个人博客"],
    ["posts_per_page", "10"],
    ["enable_comments", "true"],
    ["enable_likes", "true"],
    ["default_language", "zh-CN"],
  ];

  for (const [key, value] of configs) {
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO site_configs (key, value) VALUES (?, ?)"
      )
      .run(key, value);
  }
  console.log("  ✓ Default site configs inserted");

  console.log("\nSeed complete! 🌱");
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  sqlite.close();
  process.exit(1);
});
