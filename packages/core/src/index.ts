/**
 * @pantry-pixie/core
 * Shared types, schemas, and utilities for Pantry Pixie
 */

// Database client
export { db } from "./db";

// Re-export all schemas
export * from "./schema";

// Re-export all types
export * from "./types";

// Re-export constants
export * from "./constants";

// Re-export Pixie personality and intents
export * from "./pixie";

// Re-export commonly used drizzle operators to avoid version conflicts
export { eq, and, or, desc, asc, ilike, sql, lte, isNotNull } from "drizzle-orm";

// Test seed utility
export { seedTestUser, TEST_EMAIL, TEST_PASSWORD, TEST_NAME, type SeedResult } from "./test-seed";
