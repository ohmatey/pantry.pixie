/**
 * Pantry items schema
 * Defines items stored in pantries with inventory tracking and recurrence patterns
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { homes } from "./homes";
import { users } from "./users";

// Item category enum
export const itemCategoryEnum = pgEnum("item_category", [
  "dairy",
  "meat",
  "produce",
  "grains",
  "pantry",
  "frozen",
  "beverages",
  "snacks",
  "condiments",
  "spices",
  "baking",
  "other",
]);

// Recurrence type enum
export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

// Unit of measurement enum
export const unitEnum = pgEnum("unit", [
  "piece",
  "gram",
  "kg",
  "ml",
  "liter",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "bunch",
  "dozen",
  "loaf",
  "bottle",
  "box",
  "bag",
  "package",
  "jar",
]);

/**
 * Pantry items table
 * Tracks items stored in a household's pantry
 */
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Home and user association
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  addedBy: uuid("added_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),

  // Item details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Categorization
  category: itemCategoryEnum("category").default("other"),

  // Quantity tracking
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: unitEnum("unit").notNull(),

  // Storage location in pantry (optional)
  location: varchar("location", { length: 255 }),

  // Expiry/shelf life tracking
  expiresAt: timestamp("expires_at"),
  expiryWarningDays: integer("expiry_warning_days").default(5),

  // Recurrence pattern for items that need restocking
  recurrenceType: recurrenceTypeEnum("recurrence_type").default("once"),
  recurrenceInterval: integer("recurrence_interval"), // e.g., every 7 days
  nextRecurrenceDate: date("next_recurrence_date"),

  // Pricing and sourcing
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  preferredBrand: varchar("preferred_brand", { length: 255 }),
  preferredStore: varchar("preferred_store", { length: 255 }),

  // Status
  isArchived: boolean("is_archived").default(false),

  // Notes
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull()
    .$onUpdate(() => new Date()),

  deletedAt: timestamp("deleted_at"),
});

/**
 * Item usage history table
 * Tracks when items are marked as used or consumed
 */
export const itemUsageHistory = pgTable("item_usage_history", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Foreign keys
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  markedBy: uuid("marked_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),

  // Usage details
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 2 }).notNull(),
  usageDate: timestamp("usage_date")
    .default(sql`now()`)
    .notNull(),
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
});

// Relations
export const itemsRelations = relations(items, ({ one, many }) => ({
  home: one(homes, {
    fields: [items.homeId],
    references: [homes.id],
  }),
  addedByUser: one(users, {
    fields: [items.addedBy],
    references: [users.id],
  }),
  usageHistory: many(itemUsageHistory),
}));

export const itemUsageHistoryRelations = relations(
  itemUsageHistory,
  ({ one }) => ({
    item: one(items, {
      fields: [itemUsageHistory.itemId],
      references: [items.id],
    }),
    home: one(homes, {
      fields: [itemUsageHistory.homeId],
      references: [homes.id],
    }),
    markedByUser: one(users, {
      fields: [itemUsageHistory.markedBy],
      references: [users.id],
    }),
  }),
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemUsageHistory = typeof itemUsageHistory.$inferSelect;
export type NewItemUsageHistory = typeof itemUsageHistory.$inferInsert;
