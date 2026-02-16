import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Type for the database with schema
type DbSchema = typeof schema;
export type DbType = BunSQLiteDatabase<DbSchema>;

// Lazy initialization: connection created on first use
let _db: DbType | null = null;

function initializeDb(): DbType {
  // Support DATABASE_URL for compatibility, but default to local file
  // Format: sqlite:./data/pantry.db or sqlite::memory: or just a file path
  let dbPath: string;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    if (databaseUrl.startsWith("sqlite:")) {
      dbPath = databaseUrl.replace("sqlite:", "");
    } else if (databaseUrl === ":memory:") {
      dbPath = ":memory:";
    } else {
      // Assume it's a file path
      dbPath = databaseUrl;
    }
  } else {
    // Default: use ./data/pantry.db for development, :memory: for tests
    dbPath = process.env.NODE_ENV === "test"
      ? ":memory:"
      : path.join(process.cwd(), "data", "pantry.db");
  }

  // Create data directory if using file-based DB
  if (dbPath !== ":memory:" && !dbPath.includes(":memory:")) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);

  // Enable foreign keys and WAL mode for better concurrency
  sqlite.exec("PRAGMA foreign_keys = ON;");
  if (dbPath !== ":memory:") {
    sqlite.exec("PRAGMA journal_mode = WAL;");
  }

  // Auto-create tables for in-memory test databases
  if (dbPath === ":memory:") {
    createTestTables(sqlite);
  }

  return drizzle(sqlite, { schema });
}

function createTestTables(sqlite: Database): void {
  sqlite.exec(`
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`email\` text NOT NULL,
  \`name\` text NOT NULL,
  \`password_hash\` text NOT NULL,
  \`is_verified\` integer DEFAULT 0 NOT NULL,
  \`preferred_language\` text DEFAULT 'en' NOT NULL,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS \`users_email_unique\` ON \`users\` (\`email\`);
CREATE TABLE IF NOT EXISTS \`homes\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`owner_id\` text NOT NULL,
  \`address\` text,
  \`city\` text,
  \`state\` text,
  \`postal_code\` text,
  \`timezone\` text DEFAULT 'UTC' NOT NULL,
  \`currency\` text DEFAULT 'USD' NOT NULL,
  \`monthly_budget\` integer,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`home_members\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`user_id\` text NOT NULL,
  \`role\` text DEFAULT 'member' NOT NULL,
  \`joined_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`category\` text,
  \`quantity\` integer DEFAULT 1 NOT NULL,
  \`unit\` text,
  \`location\` text,
  \`expires_at\` integer,
  \`date_added\` integer NOT NULL DEFAULT (unixepoch()),
  \`last_updated\` integer NOT NULL DEFAULT (unixepoch()),
  \`is_recurring\` integer DEFAULT 0 NOT NULL,
  \`recurring_interval\` text,
  \`recurring_last_notified\` integer,
  \`barcode\` text,
  \`price\` real,
  \`notes\` text,
  \`is_checked\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`grocery_lists\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`is_active\` integer DEFAULT 1 NOT NULL,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`completed_at\` integer,
  \`total_budget\` real,
  \`estimated_cost\` real,
  \`recurring_schedule\` text,
  \`schedule_day_of_week\` integer,
  \`schedule_day_of_month\` integer,
  \`next_reset_at\` integer,
  \`last_reset_at\` integer,
  \`round_number\` integer DEFAULT 0 NOT NULL,
  \`is_default\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`list_items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`list_id\` text NOT NULL,
  \`item_id\` text NOT NULL,
  \`quantity\` integer DEFAULT 1 NOT NULL,
  \`is_completed\` integer DEFAULT 0 NOT NULL,
  \`added_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`completed_at\` integer,
  \`notes\` text,
  \`estimated_price\` real,
  FOREIGN KEY (\`list_id\`) REFERENCES \`grocery_lists\`(\`id\`) ON DELETE cascade,
  FOREIGN KEY (\`item_id\`) REFERENCES \`items\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`chat_threads\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`title\` text,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`chat_messages\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`thread_id\` text NOT NULL,
  \`role\` text NOT NULL,
  \`content\` text NOT NULL,
  \`intent\` text,
  \`metadata\` text,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`thread_id\`) REFERENCES \`chat_threads\`(\`id\`) ON DELETE cascade
);
`);
}

export function getDb(): DbType {
  if (!_db) {
    _db = initializeDb();
  }
  return _db;
}

// Close database connection (useful for cleanup in tests)
export function closeDb(): void {
  if (_db) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_db as any).$client?.close();
    _db = null;
  }
}

// Default export for backward compatibility
// This proxy ensures the db is initialized lazily but maintains full type information
export const db = new Proxy({} as DbType, {
  get(target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
