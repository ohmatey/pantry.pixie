/**
 * Pixie AI Agent — Vercel AI SDK with tool calling
 */

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateSystemPrompt, classifyIntent } from "@pantry-pixie/core";
import { logger } from "../lib/logger";
import {
  createAddItemTool,
  createListItemsTool,
  createRemoveItemTool,
  createCheckItemTool,
  createSetRecurringTool,
  createAddToListTool,
  createListGroceryListsTool,
  createShowGroceryListEditorTool,
} from "./tools";

interface UserPreferences {
  name?: string;
  dietaryRestrictions?: string[];
  cookingSkillLevel?: "beginner" | "intermediate" | "advanced";
  budgetConsciousness?: "low" | "medium" | "high";
  homeSize?: number;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamedResponse {
  textStream: ReadableStream<string>;
  intent: string;
  fullText: Promise<string>;
  toolResults: Promise<Array<{ toolName: string; result: unknown }>>;
}

export async function createPixieResponse(
  homeId: string,
  messages: AgentMessage[],
  userPreferences?: UserPreferences,
  listId?: string | null,
): Promise<StreamedResponse> {
  const systemPrompt = generateSystemPrompt(userPreferences);

  // Classify the last user message intent for metadata
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const intent = lastUserMessage
    ? classifyIntent(lastUserMessage.content)
    : "other";

  const tools = {
    addItem: createAddItemTool(homeId),
    listItems: createListItemsTool(homeId),
    removeItem: createRemoveItemTool(homeId),
    checkItem: createCheckItemTool(homeId),
    setRecurring: createSetRecurringTool(homeId),
    addToList: createAddToListTool(homeId, listId),
    listGroceryLists: createListGroceryListsTool(homeId),
    showGroceryListEditor: createShowGroceryListEditorTool(homeId, listId),
  };

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5,
  });

  return {
    textStream: result.textStream,
    intent,
    fullText: result.text.then((t) => t),
    toolResults: result.response.then((r) =>
      r.messages
        .filter((m) => m.role === 'assistant' && m.content)
        .flatMap((m) =>
          m.content
            .filter((c) => c.type === 'tool-call')
            .map((c: any) => ({
              toolName: c.toolName,
              result: c.result,
            }))
        )
    ),
  };
}

export async function initializeAgent(): Promise<boolean> {
  const hasKey = !!process.env.OPENAI_API_KEY;
  logger.info({ openaiConfigured: hasKey }, "Pantry Pixie agent initialized");
  return hasKey;
}
