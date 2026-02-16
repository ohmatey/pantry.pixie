/**
 * Test preload — creates SQLite tables in the in-memory database before tests run.
 * Referenced in bunfig.toml [test] preload.
 */

import { getDb } from "./db";

const db = getDb();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = (db as any).$client;

client.exec(`
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`email\` text NOT NULL,
  \`name\` text NOT NULL,
  \`password_hash\` text NOT NULL,
  \`is_verified\` integer DEFAULT 0 NOT NULL,
  \`preferred_language\` text DEFAULT 'en' NOT NULL,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS \`users_email_unique\` ON \`users\` (\`email\`);

CREATE TABLE IF NOT EXISTS \`homes\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`owner_id\` text NOT NULL,
  \`address\` text,
  \`city\` text,
  \`state\` text,
  \`postal_code\` text,
  \`timezone\` text DEFAULT 'UTC' NOT NULL,
  \`currency\` text DEFAULT 'USD' NOT NULL,
  \`monthly_budget\` integer,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`home_members\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`user_id\` text NOT NULL,
  \`role\` text DEFAULT 'member' NOT NULL,
  \`joined_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`category\` text,
  \`quantity\` integer DEFAULT 1 NOT NULL,
  \`unit\` text,
  \`location\` text,
  \`expires_at\` integer,
  \`date_added\` integer NOT NULL DEFAULT (unixepoch()),
  \`last_updated\` integer NOT NULL DEFAULT (unixepoch()),
  \`is_recurring\` integer DEFAULT 0 NOT NULL,
  \`recurring_interval\` text,
  \`recurring_last_notified\` integer,
  \`barcode\` text,
  \`price\` real,
  \`notes\` text,
  \`is_checked\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`grocery_lists\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`is_active\` integer DEFAULT 1 NOT NULL,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`completed_at\` integer,
  \`total_budget\` real,
  \`estimated_cost\` real,
  \`recurring_schedule\` text,
  \`schedule_day_of_week\` integer,
  \`schedule_day_of_month\` integer,
  \`next_reset_at\` integer,
  \`last_reset_at\` integer,
  \`round_number\` integer DEFAULT 0 NOT NULL,
  \`is_default\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`list_items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`list_id\` text NOT NULL,
  \`item_id\` text NOT NULL,
  \`quantity\` integer DEFAULT 1 NOT NULL,
  \`is_completed\` integer DEFAULT 0 NOT NULL,
  \`added_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`completed_at\` integer,
  \`notes\` text,
  \`estimated_price\` real,
  FOREIGN KEY (\`list_id\`) REFERENCES \`grocery_lists\`(\`id\`) ON DELETE cascade,
  FOREIGN KEY (\`item_id\`) REFERENCES \`items\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`chat_threads\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`home_id\` text NOT NULL,
  \`title\` text,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  \`updated_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`home_id\`) REFERENCES \`homes\`(\`id\`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`chat_messages\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`thread_id\` text NOT NULL,
  \`role\` text NOT NULL,
  \`content\` text NOT NULL,
  \`intent\` text,
  \`metadata\` text,
  \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (\`thread_id\`) REFERENCES \`chat_threads\`(\`id\`) ON DELETE cascade
);
`);
