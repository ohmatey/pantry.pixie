/**
 * Chat service — business logic for chat threads and messages
 */

import {
  db,
  eq,
  desc,
  chatThreadsTable,
  chatMessagesTable,
  classifyIntent,
} from "@pantry-pixie/core";
import type { ChatMessage } from "@pantry-pixie/core";
import { createPixieResponse, type AgentMessage } from "../agent";
import type { SerializedUI } from "../ws";
import { logger } from "../lib/logger";

export async function createThread(homeId: string, title?: string) {
  const [thread] = await db
    .insert(chatThreadsTable)
    .values({
      homeId,
      title: title || "New Chat",
    })
    .returning();

  return thread;
}

export async function getThreads(homeId: string) {
  return db.query.chatThreadsTable.findMany({
    where: eq(chatThreadsTable.homeId, homeId),
    orderBy: [desc(chatThreadsTable.updatedAt)],
    limit: 20,
  });
}

export async function getMessages(threadId: string, limit = 50) {
  return db.query.chatMessagesTable.findMany({
    where: eq(chatMessagesTable.threadId, threadId),
    orderBy: [desc(chatMessagesTable.createdAt)],
    limit,
  });
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessageId: string;
  streamHandler: (
    onChunk: (text: string) => void,
    onComplete: (fullText: string, ui?: SerializedUI) => void
  ) => Promise<void>;
}

export async function sendMessage(
  threadId: string,
  homeId: string,
  userId: string,
  content: string,
  listId?: string | null
): Promise<SendMessageResult> {
  // Classify intent for metadata
  const intent = classifyIntent(content);

  // Insert user message
  const [userMessage] = await db
    .insert(chatMessagesTable)
    .values({
      threadId,
      role: "user",
      content,
      intent,
      metadata: { userId },
    })
    .returning();

  // Load recent message history for context
  const recentMessages = await db.query.chatMessagesTable.findMany({
    where: eq(chatMessagesTable.threadId, threadId),
    orderBy: [desc(chatMessagesTable.createdAt)],
    limit: 20,
  });

  // Build conversation for agent
  const agentMessages: AgentMessage[] = recentMessages
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Create placeholder assistant message
  const [assistantMessage] = await db
    .insert(chatMessagesTable)
    .values({
      threadId,
      role: "assistant",
      content: "",
      intent: "other",
    })
    .returning();

  // Update thread timestamp
  await db
    .update(chatThreadsTable)
    .set({ updatedAt: new Date() })
    .where(eq(chatThreadsTable.id, threadId));

  return {
    userMessage,
    assistantMessageId: assistantMessage.id,
    streamHandler: async (onChunk, onComplete) => {
      try {
        logger.info({ threadId, homeId, listId }, "Creating Pixie response");
        const result = await createPixieResponse(homeId, agentMessages, undefined, listId);

        // Consume text stream (AI SDK returns ReadableStream<string>)
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          onChunk(chunk);
        }

        logger.info({ threadId, fullTextLength: fullText.length }, "Text stream consumed");

        // Wait for tool results to extract UI data
        const toolResults = await result.toolResults;
        logger.info({ threadId, toolResultsCount: toolResults.length }, "Tool results received");
        let uiData: SerializedUI | undefined;

        // Extract UI data from tool results
        for (const toolResult of toolResults) {
          logger.info({ threadId, toolName: toolResult.toolName, hasResult: !!toolResult.result }, "Processing tool result");

          if (
            toolResult.result &&
            typeof toolResult.result === "object" &&
            "uiData" in toolResult.result
          ) {
            // New pattern: tools return { success, message, uiData }
            uiData = (toolResult.result as any).uiData;
            logger.info({ threadId, uiType: uiData?.type }, "Extracted uiData");
            break;
          }

          // Legacy support for addToList (returns listData directly)
          if (
            toolResult.toolName === "addToList" &&
            toolResult.result &&
            typeof toolResult.result === "object" &&
            "listData" in toolResult.result
          ) {
            uiData = {
              type: "grocery-list",
              data: (toolResult.result as any).listData,
            };
            logger.info({ threadId, uiType: "grocery-list" }, "Extracted listData from addToList");
            break;
          }
        }

        logger.info({ threadId, fullText, hasUiData: !!uiData }, "Completing stream");

        // Update assistant message with final text
        await db
          .update(chatMessagesTable)
          .set({
            content: fullText,
            intent: result.intent,
          })
          .where(eq(chatMessagesTable.id, assistantMessage.id));

        onComplete(fullText, uiData);
      } catch (err) {
        logger.error({ err }, "Agent streaming error");
        const errorText =
          "Sorry, I'm having trouble thinking right now. Could you try again in a moment?";

        await db
          .update(chatMessagesTable)
          .set({ content: errorText, intent: "other" })
          .where(eq(chatMessagesTable.id, assistantMessage.id));

        onComplete(errorText);
      }
    },
  };
}
