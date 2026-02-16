import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";

export const chatThreadsTable = sqliteTable("chat_threads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  homeId: text("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const chatMessagesTable = sqliteTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreadsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  intent: text("intent"), // classified intent: add_item, set_recurring, ask_status, budget_question, clarification_needed
  metadata: text("metadata", { mode: "json" }), // arbitrary metadata for the message
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const chatThreadRelations = relations(
  chatThreadsTable,
  ({ one, many }) => ({
    home: one(homesTable, {
      fields: [chatThreadsTable.homeId],
      references: [homesTable.id],
    }),
    messages: many(chatMessagesTable),
  }),
);

export const chatMessageRelations = relations(chatMessagesTable, ({ one }) => ({
  thread: one(chatThreadsTable, {
    fields: [chatMessagesTable.threadId],
    references: [chatThreadsTable.id],
  }),
}));

export type ChatThread = typeof chatThreadsTable.$inferSelect;
export type NewChatThread = typeof chatThreadsTable.$inferInsert;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;
