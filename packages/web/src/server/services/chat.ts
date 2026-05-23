/**
 * Chat service — business logic for chat threads and messages
 */

import {
  db,
  eq,
  desc,
  chatThreadsTable,
  chatMessagesTable,
  homesTable,
  homeMembersTable,
  itemsTable,
  itemUsageHistoryTable,
  classifyIntent,
} from "@pantry-pixie/core";
import type { ChatMessage, HouseholdContext } from "@pantry-pixie/core";
import { createPixieResponse, generateThreadTitle, type AgentMessage } from "../agent";
import type { SerializedUI } from "../ws";
import { logger } from "../lib/logger";

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const ACTIVITY_VERB: Record<string, string> = {
  added: "added",
  removed: "used up",
  checked: "checked off",
  unchecked: "unchecked",
  updated: "updated",
};

/** Recent things the OTHER partner(s) did, formatted for Pixie to reference. */
async function buildPartnerActivity(
  homeId: string,
  currentUserId: string,
  nameById: Map<string, string>,
): Promise<string | undefined> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const history = await db.query.itemUsageHistoryTable.findMany({
    where: eq(itemUsageHistoryTable.homeId, homeId),
    orderBy: [desc(itemUsageHistoryTable.createdAt)],
    limit: 40,
  });
  const partnerEvents = history
    .filter(
      (h) => h.markedBy && h.markedBy !== currentUserId && h.createdAt >= since,
    )
    .slice(0, 6);
  if (partnerEvents.length === 0) return undefined;
  return partnerEvents
    .map((e) => {
      const who = (e.markedBy && nameById.get(e.markedBy)) || "Your partner";
      return `- ${who} ${ACTIVITY_VERB[e.action] ?? e.action} ${e.itemName} (${timeAgo(e.createdAt)})`;
    })
    .join("\n");
}

/** Items expiring within 3 days, formatted for proactive nudges. */
async function buildExpiringSummary(
  homeId: string,
): Promise<string | undefined> {
  const items = await db.query.itemsTable.findMany({
    where: eq(itemsTable.homeId, homeId),
  });
  const now = Date.now();
  const soon = items
    .map((i) => ({
      name: i.name,
      days: i.expiresAt
        ? Math.ceil((i.expiresAt.getTime() - now) / 86400000)
        : null,
    }))
    .filter(
      (i): i is { name: string; days: number } =>
        i.days !== null && i.days <= 3,
    )
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);
  if (soon.length === 0) return undefined;
  return soon
    .map((i) => {
      if (i.days < 0) return `- ${i.name} (expired)`;
      if (i.days === 0) return `- ${i.name} (expires today)`;
      return `- ${i.name} (expires in ${i.days}d)`;
    })
    .join("\n");
}

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
  isFirstMessage: boolean;
  streamHandler: (
    onChunk: (text: string) => void,
    onComplete: (fullText: string, ui?: SerializedUI) => void,
  ) => Promise<void>;
}

export async function sendMessage(
  threadId: string,
  homeId: string,
  userId: string,
  content: string,
  listId?: string | null,
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
      userId,
      metadata: { userId },
    })
    .returning();

  // Load recent message history for context
  const recentMessages = await db.query.chatMessagesTable.findMany({
    where: eq(chatMessagesTable.threadId, threadId),
    orderBy: [desc(chatMessagesTable.createdAt)],
    limit: 20,
  });

  // Check if this is the first user message in the thread
  const isFirstMessage = recentMessages.filter((m) => m.role === "user").length === 0;

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

  // ---- Build the shared-household context for Pixie ----
  const homeRecord = await db.query.homesTable.findFirst({
    where: eq(homesTable.id, homeId),
  });

  // Everyone who shares this home, with their personal preferences.
  const memberships = await db.query.homeMembersTable.findMany({
    where: eq(homeMembersTable.homeId, homeId),
    with: { user: true },
  });
  const nameById = new Map<string, string>();
  for (const m of memberships) {
    if (m.user) nameById.set(m.user.id, m.user.name);
  }
  const members = memberships
    .map((m) => m.user)
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({
      name: u.name,
      dietaryRestrictions: u.dietaryRestrictions
        ? (JSON.parse(u.dietaryRestrictions) as string[])
        : undefined,
      cookingSkillLevel: u.cookingSkillLevel as
        | "beginner"
        | "intermediate"
        | "advanced"
        | undefined,
      budgetConsciousness: u.budgetConsciousness as
        | "low"
        | "medium"
        | "high"
        | undefined,
    }));

  const household: HouseholdContext = {
    members,
    householdSize: homeRecord?.householdSize ?? undefined,
    sharedDietaryRestrictions: homeRecord?.sharedDietaryRestrictions
      ? (JSON.parse(homeRecord.sharedDietaryRestrictions) as string[])
      : undefined,
    partnerActivity: await buildPartnerActivity(homeId, userId, nameById),
    expiringSummary: await buildExpiringSummary(homeId),
  };

  return {
    userMessage,
    assistantMessageId: assistantMessage.id,
    isFirstMessage,
    streamHandler: async (onChunk, onComplete) => {
      try {
        logger.info({ threadId, homeId, listId }, "Creating Pixie response");
        const result = await createPixieResponse(
          homeId,
          agentMessages,
          household,
          listId,
          userId,
        );

        // Consume text stream (AI SDK returns ReadableStream<string>)
        let fullText = "";
        const reader = result.textStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += value;
            onChunk(value);
          }
        } finally {
          reader.releaseLock();
        }

        logger.info(
          { threadId, fullTextLength: fullText.length },
          "Text stream consumed",
        );

        // Wait for tool results to extract UI data
        const toolResults = await result.toolResults;
        logger.info(
          { threadId, toolResultsCount: toolResults.length },
          "Tool results received",
        );
        let uiData: SerializedUI | undefined;

        // Extract UI data from tool results
        for (const toolResult of toolResults) {
          logger.info(
            {
              threadId,
              toolName: toolResult.toolName,
              hasResult: !!toolResult.result,
            },
            "Processing tool result",
          );

          if (
            toolResult.result &&
            typeof toolResult.result === "object" &&
            "uiData" in toolResult.result
          ) {
            // New pattern: tools return { success, message, uiData }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: (toolResult.result as any).listData,
            };
            logger.info(
              { threadId, uiType: "grocery-list" },
              "Extracted listData from addToList",
            );
            break;
          }
        }

        logger.info(
          { threadId, fullText, hasUiData: !!uiData },
          "Completing stream",
        );

        // Update assistant message with final text
        await db
          .update(chatMessagesTable)
          .set({
            content: fullText,
            intent: result.intent,
          })
          .where(eq(chatMessagesTable.id, assistantMessage.id));

        // Auto-generate a descriptive thread title after the first exchange
        if (isFirstMessage && fullText) {
          generateThreadTitle(content, fullText)
            .then((title) => {
              if (title) {
                return db
                  .update(chatThreadsTable)
                  .set({ title })
                  .where(eq(chatThreadsTable.id, threadId));
              }
            })
            .catch(() => {/* non-critical, ignore */});
        }

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
