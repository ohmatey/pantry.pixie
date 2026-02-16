/**
 * Intent classification system for Pantry Pixie
 * Helps understand what the user wants to do
 */

import type { PixieIntent } from "../types";

export interface IntentPattern {
  intent: PixieIntent;
  keywords: string[];
  patterns: RegExp[];
  examples: string[];
}

/**
 * Intent patterns used for MVP intent classification.
 * Will be upgraded to ML model in future versions.
 */
export const intentPatterns: IntentPattern[] = [
  {
    intent: "add_to_list",
    keywords: [
      "shopping list",
      "grocery list",
      "to my list",
      "on my list",
      "to the list",
    ],
    patterns: [
      /add\s+(.+)\s+to\s+(my|the)?\s*(shopping|grocery)?\s*list/i,
      /put\s+(.+)\s+on\s+(my|the)?\s*list/i,
      /ingredients?\s+for\s+(.+)/i,
    ],
    examples: [
      "add milk to my shopping list",
      "put eggs on my list",
      "add all ingredients for green curry to my list",
      "add 500g chicken breast to shopping list",
    ],
  },
  {
    intent: "add_item",
    keywords: ["add", "bought", "got", "new", "picked up", "acquired"],
    patterns: [
      /i\s+(bought|got|picked up|added|have)\s+(.+)/i,
      /(just\s+)?(bought|got)\s+(.+)/i,
      /i\s+have\s+(.+)\s+(now|at\s+home)/i,
    ],
    examples: [
      "I just bought milk",
      "Added eggs to the inventory",
      "Got some fresh tomatoes",
      "I have 2 dozen eggs now",
    ],
  },
  {
    intent: "remove_item",
    keywords: ["remove", "delete", "ran out", "used up", "finished", "ate"],
    patterns: [
      /i\s+(ran out|used up|finished)\s+(of\s+)?(.+)/i,
      /(delete|remove)\s+(.+)/i,
      /we\s+(ate|finished)\s+the\s+(.+)/i,
    ],
    examples: [
      "I ran out of milk",
      "Remove that expired cheese",
      "We finished the bread",
      "Delete eggs from inventory",
    ],
  },
  {
    intent: "set_recurring",
    keywords: ["recurring", "regular", "weekly", "monthly", "always", "remind"],
    patterns: [
      /(.+)\s+every\s+(day|week|month)/i,
      /remind\s+me\s+to\s+get\s+(.+)\s+(weekly|monthly|daily)/i,
      /set\s+(.+)\s+as\s+recurring\s+(daily|weekly|monthly)/i,
    ],
    examples: [
      "Set milk as recurring weekly",
      "Remind me to buy eggs monthly",
      "I buy bread every week",
      "Make coffee recurring daily",
    ],
  },
  {
    intent: "ask_status",
    keywords: ["do i have", "what", "status", "how many", "check"],
    patterns: [
      /do\s+i\s+have\s+(.+)\?/i,
      /how\s+many\s+(.+)/i,
      /what's?\s+(.+)\s+status/i,
      /check\s+(.+)/i,
    ],
    examples: [
      "Do I have milk?",
      "How many eggs are left?",
      "What's the status of tomatoes?",
      "Check the inventory",
    ],
  },
  {
    intent: "budget_question",
    keywords: ["budget", "spent", "cost", "expensive", "money", "price"],
    patterns: [
      /how\s+much\s+(have i\s+)?spent/i,
      /budget\s+(status|update|check)/i,
      /what's?\s+my\s+(total\s+)?spending/i,
      /is\s+(.+)\s+(within\s+)?budget/i,
    ],
    examples: [
      "How much have I spent this month?",
      "Budget status?",
      "What's my total spending?",
      "Is this within budget?",
    ],
  },
  {
    intent: "meal_planning",
    keywords: ["meal", "recipe", "cook", "prepare", "dinner", "lunch"],
    patterns: [
      /what\s+can\s+i\s+make\s+with\s+(.+)/i,
      /recipe\s+ideas/i,
      /what\s+should\s+i\s+cook/i,
      /meal\s+(plan|ideas|suggestions)/i,
    ],
    examples: [
      "What can I make with eggs and milk?",
      "Recipe ideas?",
      "What should I cook tonight?",
      "Meal planning for the week",
    ],
  },
  {
    intent: "greeting",
    keywords: ["hi", "hello", "hey", "thanks", "thanks pixie"],
    patterns: [/^(hi|hello|hey|thanks|thank you)(\s|,|!|\.)/i],
    examples: ["Hi Pixie!", "Hello", "Thanks!", "Hey there"],
  },
  {
    intent: "clarification_needed",
    keywords: ["what", "huh", "sorry", "can you", "clarify"],
    patterns: [
      /i\s+didn't\s+understand/i,
      /can\s+you\s+clarify/i,
      /what\s+do\s+you\s+mean/i,
    ],
    examples: [
      "I didn't understand that",
      "Can you clarify?",
      "What do you mean?",
    ],
  },
];

/**
 * Classify user input to determine intent
 * MVP implementation using keyword/pattern matching
 * @param input User's chat message
 * @returns Classified intent or 'other'
 */
export function classifyIntent(input: string): PixieIntent {
  const lowerInput = input.toLowerCase().trim();

  for (const pattern of intentPatterns) {
    // Check patterns first (most specific)
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        return pattern.intent;
      }
    }

    // Check keywords (fallback)
    for (const keyword of pattern.keywords) {
      if (lowerInput.includes(keyword)) {
        return pattern.intent;
      }
    }
  }

  return "other";
}

/**
 * Get helpful context about an intent
 */
export function getIntentInfo(intent: PixieIntent): {
  name: string;
  description: string;
  category: "action" | "query" | "meta";
} {
  const info: Record<
    PixieIntent,
    { name: string; description: string; category: "action" | "query" | "meta" }
  > = {
    add_to_list: {
      name: "Add to List",
      description: "User wants to add items to a shopping/grocery list",
      category: "action",
    },
    add_item: {
      name: "Add Item",
      description: "User wants to add something to their pantry",
      category: "action",
    },
    remove_item: {
      name: "Remove Item",
      description: "User wants to remove something from inventory",
      category: "action",
    },
    set_recurring: {
      name: "Set Recurring",
      description: "User wants to set up a recurring item reminder",
      category: "action",
    },
    ask_status: {
      name: "Check Status",
      description: "User wants to know current inventory status",
      category: "query",
    },
    budget_question: {
      name: "Budget Query",
      description: "User wants budget or spending information",
      category: "query",
    },
    meal_planning: {
      name: "Meal Planning",
      description: "User wants help planning meals",
      category: "query",
    },
    greeting: {
      name: "Greeting",
      description: "User is greeting or thanking",
      category: "meta",
    },
    clarification_needed: {
      name: "Clarification",
      description: "User needs clarification",
      category: "meta",
    },
    other: {
      name: "Other",
      description: "General conversation or unclassified intent",
      category: "query",
    },
  };

  return info[intent] || info.other;
}
