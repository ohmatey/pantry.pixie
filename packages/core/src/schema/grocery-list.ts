import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  numeric,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { itemsTable } from "./item";

export const groceryListsTable = pgTable("grocery_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalBudget: numeric("total_budget", { precision: 10, scale: 2 }),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  recurringSchedule: varchar("recurring_schedule", { length: 20 }), // "weekly" | "biweekly" | "monthly" | null
  scheduleDayOfWeek: integer("schedule_day_of_week"), // 0=Sun..6=Sat
  scheduleDayOfMonth: integer("schedule_day_of_month"), // 1-28
  nextResetAt: timestamp("next_reset_at"),
  lastResetAt: timestamp("last_reset_at"),
  roundNumber: integer("round_number").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const listItemsTable = pgTable("list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id")
    .notNull()
    .references(() => groceryListsTable.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }),
});

export const groceryListRelations = relations(
  groceryListsTable,
  ({ one, many }) => ({
    home: one(homesTable, {
      fields: [groceryListsTable.homeId],
      references: [homesTable.id],
    }),
    items: many(listItemsTable),
  })
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
