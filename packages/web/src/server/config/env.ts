/**
 * Environment variable validation
 */

import { z } from "zod";

const envSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Server
  PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
  HOST: z.string().default("localhost"),

  // Database — the data layer is SQLite (bun:sqlite). `db.ts` understands
  // sqlite:/file path/:memory: values and defaults to a local file when unset,
  // so DATABASE_URL is optional here (do NOT require a postgres URL).
  DATABASE_URL: z.string().optional(),
  DB_POOL_MAX: z.string().regex(/^\d+$/).transform(Number).default("20"),
  DB_IDLE_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("30"),
  DB_CONNECT_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("10"),

  // Authentication — required in production; a dev fallback is applied below
  // so the app boots locally without a .env.
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .optional(),

  // AI (optional in test mode, uses mocks)
  OPENAI_API_KEY: z
    .string()
    .startsWith("sk-")
    .optional()
    .or(z.literal("")),

  // Security
  ALLOWED_ORIGINS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_POINTS: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_DURATION: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_BLOCK_DURATION: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),

  // Timeouts
  REQUEST_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("30000"),

  // Logging
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

// Validate environment variables at startup
let parsed: z.infer<typeof envSchema>;

try {
  parsed = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:");
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// JWT secret: mandatory in production; dev/test get a local-only fallback so the
// app boots without a .env. We also write it back to process.env so modules that
// read process.env.JWT_SECRET directly (auth) stay consistent with this value.
// This file is imported first in the server entrypoint, before auth loads.
const DEV_JWT_SECRET = "pantry-pixie-dev-only-insecure-secret-change-me";
let jwtSecret = parsed.JWT_SECRET;
if (!jwtSecret) {
  if (parsed.NODE_ENV === "production") {
    console.error("❌ Invalid environment variables:");
    console.error("  - JWT_SECRET: required in production");
    process.exit(1);
  }
  jwtSecret = DEV_JWT_SECRET;
}
process.env.JWT_SECRET = jwtSecret;

export const env = {
  ...parsed,
  JWT_SECRET: jwtSecret,
};
