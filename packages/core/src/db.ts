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
