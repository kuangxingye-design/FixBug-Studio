import { db } from "./index";
import { users, articles, categories, tags, articleTags, siteSettings } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@blog.local",
      username: "admin",
      passwordHash,
      displayName: "Blog Admin",
      bio: "A passionate writer and knowledge sharer.",
      role: "admin",
    })
    .returning()
    .onConflictDoNothing();

  console.log("Admin user created:", admin?.id ?? "(already exists)");

  // Create categories
  const categoryData = [
    { name: "Technology", slug: "technology", color: "#2563eb" },
    { name: "Life", slug: "life", color: "#16a34a" },
    { name: "Notes", slug: "notes", color: "#d97706" },
    { name: "Tutorial", slug: "tutorial", color: "#9333ea" },
  ];

  const insertedCategories = await Promise.all(
    categoryData.map((c) =>
      db.insert(categories).values(c).returning().onConflictDoNothing()
    )
  );
  const categoryIds = insertedCategories.map((r) => r[0]?.id).filter(Boolean);
  console.log(`Created ${categoryIds.length} categories`);

  // Create tags
  const tagData = [
    { name: "JavaScript", slug: "javascript" },
    { name: "TypeScript", slug: "typescript" },
    { name: "React", slug: "react" },
    { name: "Next.js", slug: "nextjs" },
    { name: "AI", slug: "ai" },
    { name: "Claude", slug: "claude" },
    { name: "Node.js", slug: "nodejs" },
    { name: "Database", slug: "database" },
    { name: "Productivity", slug: "productivity" },
    { name: "Writing", slug: "writing" },
  ];

  const insertedTags = await Promise.all(
    tagData.map((t) =>
      db.insert(tags).values(t).returning().onConflictDoNothing()
    )
  );
  const tagIds = insertedTags.map((r) => r[0]?.id).filter(Boolean);
  console.log(`Created ${tagIds.length} tags`);

  // Create a sample article
  const [article] = await db
    .insert(articles)
    .values({
      title: "Welcome to My Blog",
      slug: "welcome-to-my-blog",
      excerpt:
        "An introduction to this AI-powered blog and how it transforms rough notes into polished articles.",
      content: `## Welcome to My AI-Powered Blog

This blog is built with a unique feature: **AI-assisted document processing**.

### How It Works

1. Upload your rough markdown notes or manuscripts
2. AI analyzes the content and reorganizes it into a well-structured article
3. The AI suggests metadata like title, tags, category, and summary
4. You review, edit, and publish

### Why This Matters

As developers and knowledge workers, we take a lot of notes. But converting those notes into something worth sharing often takes more effort than writing them in the first place.

This blog removes that friction. **Write raw. Share polished.**

### Features

- Markdown-based with full GFM support
- Syntax highlighting for code blocks
- Full-text search
- RSS feed and sitemap
- Dark mode support
- Responsive design

Happy reading!`,
      status: "published",
      categoryId: categoryIds[0] ?? null,
      readingTime: 2,
      isFeatured: true,
      publishedAt: new Date().toISOString(),
    })
    .returning();

  if (article && tagIds.length >= 3) {
    await db
      .insert(articleTags)
      .values([
        { articleId: article.id, tagId: tagIds[4] }, // AI
        { articleId: article.id, tagId: tagIds[9] }, // Writing
        { articleId: article.id, tagId: tagIds[3] }, // Next.js
      ])
      .onConflictDoNothing();
  }

  console.log("Sample article created:", article?.id ?? "(already exists)");

  // Set default site settings
  const settings = [
    { key: "site_name", value: "My AI Blog" },
    { key: "site_description", value: "A personal blog powered by AI-assisted writing" },
    { key: "posts_per_page", value: "10" },
    { key: "enable_comments", value: "true" },
    { key: "auto_approve_comments", value: "false" },
    { key: "about_content", value: "# About Me\n\nWelcome to my blog! I write about technology, coding, and life." },
    { key: "social_github", value: "" },
    { key: "social_twitter", value: "" },
    { key: "social_linkedin", value: "" },
    { key: "footer_text", value: "© 2025 My AI Blog. All rights reserved." },
  ];

  for (const setting of settings) {
    await db
      .insert(siteSettings)
      .values(setting)
      .onConflictDoNothing();
  }

  console.log("Site settings created");
  console.log("Seed complete!");
}

seed().catch(console.error);
