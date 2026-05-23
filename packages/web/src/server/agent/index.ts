/**
 * Pixie AI Agent — Vercel AI SDK with tool calling
 * In test mode, uses mock responses instead of OpenAI API
 */

import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  generateHouseholdPrompt,
  classifyIntent,
  type HouseholdContext,
} from "@pantry-pixie/core";
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
  createQueryBudgetTool,
  createSuggestMealsTool,
} from "./tools";

// Use mock in test mode
const USE_MOCK = process.env.NODE_ENV === "test" && !process.env.OPENAI_API_KEY;

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
  household?: HouseholdContext,
  listId?: string | null,
  actorId?: string,
): Promise<StreamedResponse> {
  // Use mock in test mode
  if (USE_MOCK) {
    const { createPixieResponse: mockResponse } = await import(
      "./__mocks__/index"
    );
    return mockResponse(homeId, messages, household, listId);
  }

  const systemPrompt = generateHouseholdPrompt(household ?? {});

  // Merge every partner's dietary needs (+ house rules) for meal suggestions.
  const dietary = new Set<string>();
  for (const m of household?.members ?? [])
    for (const d of m.dietaryRestrictions ?? []) dietary.add(d);
  for (const d of household?.sharedDietaryRestrictions ?? []) dietary.add(d);

  // Classify the last user message intent for metadata
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const intent = lastUserMessage
    ? classifyIntent(lastUserMessage.content)
    : "other";

  const tools = {
    addItem: createAddItemTool(homeId, actorId),
    listItems: createListItemsTool(homeId),
    removeItem: createRemoveItemTool(homeId, actorId),
    checkItem: createCheckItemTool(homeId),
    setRecurring: createSetRecurringTool(homeId),
    addToList: createAddToListTool(homeId, listId),
    listGroceryLists: createListGroceryListsTool(homeId),
    showGroceryListEditor: createShowGroceryListEditorTool(homeId, listId),
    queryBudget: createQueryBudgetTool(homeId),
    suggestMeals: createSuggestMealsTool(homeId, [...dietary]),
  };

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
    tools,
  });

  return {
    textStream: result.textStream,
    intent,
    fullText: Promise.resolve(result.text),
    toolResults: Promise.resolve(result.response).then((r) =>
      (r.messages ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => m.role === "tool")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .flatMap((m: any) => (Array.isArray(m.content) ? m.content : []))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.type === "tool-result")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({ toolName: c.toolName, result: c.result })),
    ),
  };
}

export async function initializeAgent(): Promise<boolean> {
  const hasKey = !!process.env.OPENAI_API_KEY;
  logger.info({ openaiConfigured: hasKey }, "Pantry Pixie agent initialized");
  return hasKey;
}

export async function generateThreadTitle(
  userMessage: string,
  assistantReply: string,
): Promise<string | null> {
  if (USE_MOCK) return null;
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Create a short chat title (4–6 words, no punctuation) that captures what this conversation is about.

User: ${userMessage.slice(0, 200)}
Pixie: ${assistantReply.slice(0, 200)}

Title:`,
      maxOutputTokens: 20,
    });
    return text.trim().replace(/^["'.]+|["'.]+$/g, "").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Generate the weekly "Sunday Sync" digest — a warm summary of the household's
 * week that both partners can gather around. Returns null in mock/test mode or
 * on error so the scheduler can skip cleanly.
 */
export async function generateSundaySyncDigest(input: {
  partnerNames: string[];
  addedCount: number;
  removedCount: number;
  expiring: string[];
  recurringDue: string[];
}): Promise<string | null> {
  if (USE_MOCK) return null;
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: generateHouseholdPrompt({
        members: input.partnerNames.map((name) => ({ name })),
      }),
      prompt: `Write a warm, brief "Sunday Sync" weekly digest for this household. Speak to both partners as a team.

This week's data:
- Items added to the pantry: ${input.addedCount}
- Items used up: ${input.removedCount}
- Expiring soon: ${input.expiring.length ? input.expiring.join(", ") : "nothing"}
- Staples auto-added to the list: ${input.recurringDue.length ? input.recurringDue.join(", ") : "none"}

Keep it under 120 words, encouraging and a little playful, and end with ONE concrete suggestion for the week ahead.`,
      maxOutputTokens: 250,
    });
    return text.trim() || null;
  } catch {
    return null;
  }
}
