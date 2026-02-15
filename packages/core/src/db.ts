import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Connection pool configuration
const client = postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
  ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
});

export const db = drizzle(client, { schema });
