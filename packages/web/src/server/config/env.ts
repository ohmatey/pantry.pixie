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

  // Database
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DB_POOL_MAX: z.string().regex(/^\d+$/).transform(Number).default("20"),
  DB_IDLE_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("30"),
  DB_CONNECT_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default("10"),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  // AI
  OPENAI_API_KEY: z.string().startsWith("sk-"),

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
let validatedEnv: z.infer<typeof envSchema>;

try {
  validatedEnv = envSchema.parse(process.env);
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

export const env = validatedEnv;
