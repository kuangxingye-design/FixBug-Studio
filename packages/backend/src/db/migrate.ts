import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || "./data/fixbug-studio.db";

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

// Run migrations
const migrationsFolder = join(__dirname, "..", "..", "drizzle");
console.log(`Running migrations from: ${migrationsFolder}`);
console.log(`Database: ${DB_PATH}`);

await migrate(db, { migrationsFolder });

console.log("Migrations complete!");
sqlite.close();
