import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { listItemsTable } from "./grocery-list";

export const itemsTable = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  quantity: integer("quantity").default(1).notNull(),
  unit: varchar("unit", { length: 20 }), // e.g., "pieces", "lbs", "liters"
  location: varchar("location", { length: 100 }), // e.g., "pantry shelf 3", "freezer"
  expiresAt: timestamp("expires_at"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringInterval: varchar("recurring_interval", { length: 20 }), // "daily", "weekly", "monthly"
  recurringLastNotified: timestamp("recurring_last_notified"),
  barcode: text("barcode"),
  price: numeric("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  isChecked: boolean("is_checked").default(false).notNull(),
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
