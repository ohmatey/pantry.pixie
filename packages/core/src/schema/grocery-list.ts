import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { itemsTable } from "./item";

export const groceryListsTable = sqliteTable("grocery_lists", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  totalBudget: real("total_budget"),
  estimatedCost: real("estimated_cost"),
  recurringSchedule: text("recurring_schedule"), // "weekly" | "biweekly" | "monthly" | null
  scheduleDayOfWeek: integer("schedule_day_of_week"), // 0=Sun..6=Sat
  scheduleDayOfMonth: integer("schedule_day_of_month"), // 1-28
  nextResetAt: integer("next_reset_at", { mode: "timestamp" }),
  lastResetAt: integer("last_reset_at", { mode: "timestamp" }),
  roundNumber: integer("round_number").default(0).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
});

export const listItemsTable = sqliteTable("list_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: text("list_id")
    .notNull()
    .references(() => groceryListsTable.id, { onDelete: "cascade" }),
  itemId: text("item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).default(false).notNull(),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  notes: text("notes"),
  estimatedPrice: real("estimated_price"),
});

export const groceryListRelations = relations(
  groceryListsTable,
  ({ one, many }) => ({
    home: one(homesTable, {
      fields: [groceryListsTable.homeId],
      references: [homesTable.id],
    }),
    items: many(listItemsTable),
  }),
);

export const listItemsRelations = relations(listItemsTable, ({ one }) => ({
  list: one(groceryListsTable, {
    fields: [listItemsTable.listId],
    references: [groceryListsTable.id],
  }),
  item: one(itemsTable, {
    fields: [listItemsTable.itemId],
    references: [itemsTable.id],
  }),
}));

export type GroceryList = typeof groceryListsTable.$inferSelect;
export type NewGroceryList = typeof groceryListsTable.$inferInsert;
export type ListItem = typeof listItemsTable.$inferSelect;
export type NewListItem = typeof listItemsTable.$inferInsert;
