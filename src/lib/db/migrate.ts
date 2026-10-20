import { sqlite } from "./index";
import { execSync } from "child_process";

// Run migrations and set up FTS5
async function migrate() {
  console.log("Running Drizzle Kit migrations...");

  // Execute drizzle-kit push programmatically
  execSync("npx drizzle-kit push", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // Set up FTS5 virtual table (drop first to ensure clean state)
  console.log("Setting up FTS5 search index...");
  sqlite.exec(`
    DROP TABLE IF EXISTS articles_fts;

    CREATE VIRTUAL TABLE articles_fts USING fts5(
      title,
      content,
      excerpt,
      content='articles',
      content_rowid='id'
    );

    -- Triggers to keep FTS index in sync
    DROP TRIGGER IF EXISTS articles_ai;
    CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, content, excerpt)
      VALUES (new.id, new.title, new.content, new.excerpt);
    END;

    DROP TRIGGER IF EXISTS articles_ad;
    CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, excerpt)
      VALUES ('delete', old.id, old.title, old.content, old.excerpt);
    END;

    DROP TRIGGER IF EXISTS articles_au;
    CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, excerpt)
      VALUES ('delete', old.id, old.title, old.content, old.excerpt);
      INSERT INTO articles_fts(rowid, title, content, excerpt)
      VALUES (new.id, new.title, new.content, new.excerpt);
    END;
  `);

  console.log("Migration complete.");
}

migrate().catch(console.error);
