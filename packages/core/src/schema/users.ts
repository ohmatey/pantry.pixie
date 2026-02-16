/**
 * User schema using Drizzle ORM
 * Defines the users table for authentication and profile management
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Basic profile information
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),

  // Avatar/profile picture URL
  avatar: text("avatar"),

  // Authentication
  // Note: passwords should be hashed and stored securely
  // This schema assumes external auth provider or auth middleware handles password hashing
  passwordHash: text("password_hash"),

  // Email verification
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),

  // Account status
  isActive: boolean("is_active").default(true),

  // Preferences
  preferredLanguage: varchar("preferred_language", { length: 10 }).default(
    "en",
  ),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),

  // Timestamps
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull()
    .$onUpdate(() => new Date()),

  // Soft delete support
  deletedAt: timestamp("deleted_at"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
