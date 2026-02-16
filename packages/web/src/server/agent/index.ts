/**
 * Pixie AI Agent — Vercel AI SDK with tool calling
 * In test mode, uses mock responses instead of OpenAI API
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

// Use mock in test mode
const USE_MOCK = process.env.NODE_ENV === "test" && !process.env.OPENAI_API_KEY;

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
  // Use mock in test mode
  if (USE_MOCK) {
    const { createPixieResponse: mockResponse } = await import(
      "./__mocks__/index"
    );
    return mockResponse(homeId, messages, userPreferences, listId);
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: openai("gpt-4o-mini") as any,
    system: systemPrompt,
    messages,
    tools,
  });

  return {
    textStream: result.textStream,
    intent,
    fullText: Promise.resolve(result.text).then((t) => t),
    toolResults: Promise.resolve(result.response).then((r) =>
      r.messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => m.role === 'assistant' && Array.isArray(m.content))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .flatMap((m: any) =>
          m.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.type === 'tool-call')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
