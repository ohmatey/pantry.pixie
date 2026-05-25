import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { usersTable } from "./user";

/**
 * Pending home-invite codes. Persisted (not in-memory) so an invite survives a
 * server restart/redeploy — a must before launch. Single-use: a row is deleted
 * when the invite is accepted, and expired rows are swept on each operation.
 */
export const inviteCodesTable = sqliteTable("invite_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const inviteCodesRelations = relations(inviteCodesTable, ({ one }) => ({
  home: one(homesTable, {
    fields: [inviteCodesTable.homeId],
    references: [homesTable.id],
  }),
  inviter: one(usersTable, {
    fields: [inviteCodesTable.inviterId],
    references: [usersTable.id],
  }),
}));

export type InviteCode = typeof inviteCodesTable.$inferSelect;
export type NewInviteCode = typeof inviteCodesTable.$inferInsert;
