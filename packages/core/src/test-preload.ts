/**
 * Test preload — triggers DB initialization before tests run.
 * Referenced in bunfig.toml [test] preload.
 *
 * Table creation is handled inside initializeDb() in db.ts when
 * using an in-memory database, so this just ensures the DB singleton
 * is initialized early.
 */

// Trigger DB initialization (no-op if already initialized)
import "./db";
