import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { usersTable } from "./user";

/**
 * Durable in-app notifications. Unlike the ephemeral WebSocket broadcasts, these
 * persist so an offline partner sees what happened when they return. `type` and
 * `refId` are open/free-text so future household domains can add notification
 * kinds without a schema change.
 */
export const notificationsTable = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  // Target member; null = the whole household.
  userId: text("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // "recurring_due" | "expiring_soon" | "partner_activity" | "sunday_sync"
  title: text("title").notNull(),
  body: text("body"),
  refId: text("ref_id"), // related entity id (itemId, threadId, …)
  isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    home: one(homesTable, {
      fields: [notificationsTable.homeId],
      references: [homesTable.id],
    }),
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;
