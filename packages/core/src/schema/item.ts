import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { usersTable } from "./user";
import { listItemsTable } from "./grocery-list";

export const itemsTable = sqliteTable("items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  quantity: integer("quantity").default(1).notNull(),
  unit: text("unit"), // e.g., "pieces", "lbs", "liters"
  location: text("location"), // e.g., "pantry shelf 3", "freezer"
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  dateAdded: integer("date_added", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false).notNull(),
  recurringInterval: text("recurring_interval"), // "daily", "weekly", "monthly"
  recurringLastNotified: integer("recurring_last_notified", { mode: "timestamp" }),
  barcode: text("barcode"),
  price: real("price"),
  notes: text("notes"),
  isChecked: integer("is_checked", { mode: "boolean" }).default(false).notNull(),
  // Which household member added this item. Nullable: existing rows + system adds
  // have no actor, and we keep the item if the user is deleted.
  addedBy: text("added_by").references(() => usersTable.id, { onDelete: "set null" }),
});

export const itemsRelations = relations(itemsTable, ({ one, many }) => ({
  home: one(homesTable, {
    fields: [itemsTable.homeId],
    references: [homesTable.id],
  }),
  addedByUser: one(usersTable, {
    fields: [itemsTable.addedBy],
    references: [usersTable.id],
  }),
  listItems: many(listItemsTable),
}));

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

/**
 * Durable log of item actions (added / removed / checked / unchecked / updated).
 * Doubles as the home activity feed source. `action` is free-text and `itemName`
 * is denormalized so the log stays domain-neutral and survives item deletion —
 * future household domains (chores, bills) can reuse the same table.
 */
export const itemUsageHistoryTable = sqliteTable("item_usage_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  // No FK: history must survive item deletion so "removed" events stay visible.
  itemId: text("item_id"),
  itemName: text("item_name").notNull(),
  markedBy: text("marked_by").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(), // "added" | "removed" | "checked" | "unchecked" | "updated"
  quantity: integer("quantity"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const itemUsageHistoryRelations = relations(itemUsageHistoryTable, ({ one }) => ({
  home: one(homesTable, {
    fields: [itemUsageHistoryTable.homeId],
    references: [homesTable.id],
  }),
  markedByUser: one(usersTable, {
    fields: [itemUsageHistoryTable.markedBy],
    references: [usersTable.id],
  }),
}));

export type ItemUsageHistory = typeof itemUsageHistoryTable.$inferSelect;
export type NewItemUsageHistory = typeof itemUsageHistoryTable.$inferInsert;
