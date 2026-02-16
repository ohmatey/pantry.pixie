import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { homesTable } from "./home";

export const chatThreadsTable = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homesTable.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => chatThreadsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  intent: varchar("intent", { length: 50 }), // classified intent: add_item, set_recurring, ask_status, budget_question, clarification_needed
  metadata: jsonb("metadata"), // arbitrary metadata for the message
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
