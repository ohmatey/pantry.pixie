/**
 * Test helpers for checking database availability and skipping tests
 */

/**
 * Check if PostgreSQL database is available
 * Returns true if DATABASE_URL is set, false otherwise
 * Note: We don't try to connect here to avoid import-time connection attempts
 */
export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Returns true if tests should be skipped due to missing database
 * Use with Bun's test.skipIf()
 */
export function shouldSkipDatabaseTests(): boolean {
  return !isDatabaseAvailable();
}
