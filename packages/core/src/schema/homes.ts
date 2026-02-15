/**
 * Home and household management schema
 * Defines homes (households) and their members with role-based access
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  boolean,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { users } from "./users";

// Role enum for home membership
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

/**
 * Homes table - represents a household
 */
export const homes = pgTable("homes", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Basic information
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Address information
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),

  // Home settings
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  locale: varchar("locale", { length: 10 }).default("en-US"),

  // Owner information
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),

  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull()
    .$onUpdate(() => new Date()),

  deletedAt: timestamp("deleted_at"),
});

/**
 * Home members table - many-to-many relationship with roles
 */
export const homeMembers = pgTable(
  "home_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign keys
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Role in the home
    role: memberRoleEnum("role").notNull().default("member"),

    // Invitation tracking
    invitedAt: timestamp("invited_at").default(sql`now()`).notNull(),
    joinedAt: timestamp("joined_at"),

    // Inviter tracking (who added this member)
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Status
    isActive: boolean("is_active").default(true),

    // Timestamps
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.homeId, table.userId] }),
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [users.id],
      name: "home_members_invited_by_fk",
    }),
  ]
);

// Relations
export const homesRelations = relations(homes, ({ one, many }) => ({
  owner: one(users, {
    fields: [homes.ownerId],
    references: [users.id],
  }),
  members: many(homeMembers),
}));

export const homeMembersRelations = relations(homeMembers, ({ one }) => ({
  home: one(homes, {
    fields: [homeMembers.homeId],
    references: [homes.id],
  }),
  user: one(users, {
    fields: [homeMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [homeMembers.invitedBy],
    references: [users.id],
    relationName: "invitedBy",
  }),
}));

export type Home = typeof homes.$inferSelect;
export type NewHome = typeof homes.$inferInsert;
export type HomeMember = typeof homeMembers.$inferSelect;
export type NewHomeMember = typeof homeMembers.$inferInsert;
