import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";
import { usersTable } from "./user";
import { itemsTable } from "./item";

/**
 * A scanned receipt. Persists the merchant/date/total the vision parser already
 * extracts (previously discarded) so spend is auditable: "what was this ฿X
 * charge?" and total-vs-items reconciliation. Items link back via items.receiptId.
 */
export const receiptsTable = sqliteTable("receipts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  merchant: text("merchant"),
  purchasedAt: integer("purchased_at", { mode: "timestamp" }),
  currency: text("currency"),
  total: real("total"),
  itemCount: integer("item_count").default(0).notNull(),
  // Who scanned it. Nullable: keep the receipt if the user is deleted.
  scannedBy: text("scanned_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const receiptsRelations = relations(receiptsTable, ({ one, many }) => ({
  home: one(homesTable, {
    fields: [receiptsTable.homeId],
    references: [homesTable.id],
  }),
  scannedByUser: one(usersTable, {
    fields: [receiptsTable.scannedBy],
    references: [usersTable.id],
  }),
  items: many(itemsTable),
}));

export type Receipt = typeof receiptsTable.$inferSelect;
export type NewReceipt = typeof receiptsTable.$inferInsert;
