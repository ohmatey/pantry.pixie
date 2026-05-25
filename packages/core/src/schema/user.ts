import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false).notNull(),
  preferredLanguage: text("preferred_language").default("en").notNull(),
  // Pixie personalization preferences
  dietaryRestrictions: text("dietary_restrictions"), // JSON array stored as text
  cookingSkillLevel: text("cooking_skill_level"), // "beginner" | "intermediate" | "advanced"
  budgetConsciousness: text("budget_consciousness"), // "low" | "medium" | "high"
  // Per-user muted notification types (JSON array of NotificationType as text).
  // null/absent = nothing muted. Mirrors dietaryRestrictions storage.
  mutedNotificationTypes: text("muted_notification_types"),
  // NOTE: household size is a property of the HOME (shared by both partners),
  // not the user — see homesTable.householdSize.
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  homes: many(homesTable),
}));

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
