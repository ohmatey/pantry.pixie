import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Type for the database with schema
type DbSchema = typeof schema;
export type DbType = PostgresJsDatabase<DbSchema>;

// Lazy initialization: connection created on first use
let _db: DbType | null = null;

function initializeDb(): DbType {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Connection pool configuration
  const client = postgres(connectionString, {
    max: parseInt(process.env.DB_POOL_MAX || "20"),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || "30"),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10"),
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });

  return drizzle(client, { schema });
}

export function getDb(): DbType {
  if (!_db) {
    _db = initializeDb();
  }
  return _db;
}

// Default export for backward compatibility
// This proxy ensures the db is initialized lazily but maintains full type information
export const db = new Proxy({} as DbType, {
  get(target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
