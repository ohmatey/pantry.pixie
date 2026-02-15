import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user";
import { itemsTable } from "./item";
import { groceryListsTable } from "./grocery-list";
import { chatThreadsTable } from "./chat";

export const homesTable = pgTable("homes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  address: text("address"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  postalCode: varchar("postal_code", { length: 10 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  monthlyBudget: integer("monthly_budget"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const homeMembersTable = pgTable("home_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member").notNull(), // owner, admin, member, viewer
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
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
