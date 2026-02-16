import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
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
});

export const itemsRelations = relations(itemsTable, ({ one, many }) => ({
  home: one(homesTable, {
    fields: [itemsTable.homeId],
    references: [homesTable.id],
  }),
  listItems: many(listItemsTable),
}));

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
