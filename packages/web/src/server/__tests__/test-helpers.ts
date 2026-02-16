/**
 * Test helpers for checking database availability and skipping tests
 */

/**
 * Check if database is available for tests.
 * With the SQLite in-memory setup (via test-preload.ts), the DB is always available.
 */
export function isDatabaseAvailable(): boolean {
  return true;
}

/**
 * Returns true if tests should be skipped due to missing database.
 * With the test preload creating in-memory SQLite tables, the DB is always available.
 */
export function shouldSkipDatabaseTests(): boolean {
  return false;
}
