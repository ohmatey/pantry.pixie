import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user";
import { itemsTable } from "./item";
import { groceryListsTable } from "./grocery-list";
import { chatThreadsTable } from "./chat";

export const homesTable = sqliteTable("homes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  timezone: text("timezone").default("UTC").notNull(),
  currency: text("currency").default("USD").notNull(),
  monthlyBudget: integer("monthly_budget"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const homeRelations = relations(homesTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [homesTable.ownerId],
    references: [usersTable.id],
  }),
  items: many(itemsTable),
  groceryLists: many(groceryListsTable),
  chatThreads: many(chatThreadsTable),
  members: many(homeMembersTable),
}));

export const homeMembersTable = sqliteTable("home_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(), // owner, admin, member, viewer
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const homeMembersRelations = relations(homeMembersTable, ({ one }) => ({
  home: one(homesTable, {
    fields: [homeMembersTable.homeId],
    references: [homesTable.id],
  }),
  user: one(usersTable, {
    fields: [homeMembersTable.userId],
    references: [usersTable.id],
  }),
}));

export type Home = typeof homesTable.$inferSelect;
export type NewHome = typeof homesTable.$inferInsert;
export type HomeMember = typeof homeMembersTable.$inferSelect;
export type NewHomeMember = typeof homeMembersTable.$inferInsert;
