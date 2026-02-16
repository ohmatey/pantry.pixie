import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Type for the database with schema
type DbSchema = typeof schema;
export type DbType = BetterSQLite3Database<DbSchema>;

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
    if (!Bun.file(dir).exists()) {
      const fs = require("fs");
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);

  // Enable foreign keys and WAL mode for better concurrency
  sqlite.pragma("foreign_keys = ON");
  if (dbPath !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }

  return drizzle(sqlite, { schema });
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
    // Type assertion needed as better-sqlite3's close isn't in drizzle types
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
