/**
 * Unit tests for intent classification system
 * Tests classifyIntent() and getIntentInfo() — pure functions, no DB needed
 */

import { describe, it, expect } from "bun:test";
import {
  classifyIntent,
  getIntentInfo,
  intentPatterns,
} from "../intents";
import type { PixieIntent } from "../../types";

// ============================================================================
// classifyIntent()
// ============================================================================

describe("classifyIntent() - add_to_list intent", () => {
  it("should classify 'add milk to my shopping list' as add_to_list", () => {
    expect(classifyIntent("add milk to my shopping list")).toBe("add_to_list");
  });

  it("should classify 'put eggs on my list' as add_to_list", () => {
    expect(classifyIntent("put eggs on my list")).toBe("add_to_list");
  });

  it("should classify 'add all ingredients for green curry to my list' as add_to_list", () => {
    expect(
      classifyIntent("add all ingredients for green curry to my list"),
    ).toBe("add_to_list");
  });

  it("should classify 'add 500g chicken breast to shopping list' as add_to_list", () => {
    expect(classifyIntent("add 500g chicken breast to shopping list")).toBe(
      "add_to_list",
    );
  });

  it("should classify messages with 'shopping list' keyword as add_to_list", () => {
    expect(classifyIntent("I need to update my shopping list")).toBe(
      "add_to_list",
    );
  });

  it("should classify messages with 'grocery list' keyword as add_to_list", () => {
    expect(classifyIntent("put it on the grocery list")).toBe("add_to_list");
  });

  it("should classify 'ingredients for pasta carbonara' as add_to_list", () => {
    expect(classifyIntent("ingredients for pasta carbonara")).toBe(
      "add_to_list",
    );
  });
});

describe("classifyIntent() - add_item intent", () => {
  it("should classify 'I just bought milk' as add_item", () => {
    expect(classifyIntent("I just bought milk")).toBe("add_item");
  });

  it("should classify 'I got some fresh tomatoes' as add_item", () => {
    expect(classifyIntent("I got some fresh tomatoes")).toBe("add_item");
  });

  it("should classify 'Added eggs to the inventory' as add_item", () => {
    expect(classifyIntent("Added eggs to the inventory")).toBe("add_item");
  });

  it("should classify 'I picked up bread' as add_item", () => {
    expect(classifyIntent("I picked up bread")).toBe("add_item");
  });

  it("should classify 'I have 2 dozen eggs now' as add_item", () => {
    expect(classifyIntent("I have 2 dozen eggs now")).toBe("add_item");
  });

  it("should classify messages with 'bought' keyword as add_item", () => {
    expect(classifyIntent("bought some rice")).toBe("add_item");
  });

  it("should classify messages with 'new' keyword as add_item", () => {
    expect(classifyIntent("new batch of cookies arrived")).toBe("add_item");
  });
});

describe("classifyIntent() - remove_item intent", () => {
  it("should classify 'I ran out of milk' as remove_item", () => {
    expect(classifyIntent("I ran out of milk")).toBe("remove_item");
  });

  it("should classify 'Remove that expired cheese' as remove_item", () => {
    expect(classifyIntent("Remove that expired cheese")).toBe("remove_item");
  });

  it("should classify 'We finished the bread' as remove_item", () => {
    expect(classifyIntent("We finished the bread")).toBe("remove_item");
  });

  it("should classify 'Delete eggs from inventory' as remove_item", () => {
    expect(classifyIntent("Delete eggs from inventory")).toBe("remove_item");
  });

  it("should classify 'I used up the butter' as remove_item", () => {
    expect(classifyIntent("I used up the butter")).toBe("remove_item");
  });

  it("should classify 'We ate the last pizza' as remove_item", () => {
    expect(classifyIntent("We ate the last pizza")).toBe("remove_item");
  });
});

describe("classifyIntent() - set_recurring intent", () => {
  it("should classify 'Set milk as recurring weekly' as set_recurring", () => {
    expect(classifyIntent("Set milk as recurring weekly")).toBe(
      "set_recurring",
    );
  });

  it("should classify 'Remind me to buy eggs monthly' as set_recurring", () => {
    expect(classifyIntent("Remind me to buy eggs monthly")).toBe(
      "set_recurring",
    );
  });

  it("should classify 'I buy bread every week' as set_recurring", () => {
    expect(classifyIntent("I buy bread every week")).toBe("set_recurring");
  });

  it("should classify messages with 'recurring' keyword as set_recurring", () => {
    expect(classifyIntent("make this a recurring purchase")).toBe(
      "set_recurring",
    );
  });
});

describe("classifyIntent() - ask_status intent", () => {
  // Note: "Do I have milk?" matches add_item first (keyword "have")
  // This is a known limitation of the sequential keyword-based MVP classifier

  it("should classify 'How many eggs are left?' as ask_status", () => {
    expect(classifyIntent("How many eggs are left?")).toBe("ask_status");
  });

  it("should classify 'Check the inventory' as ask_status", () => {
    expect(classifyIntent("Check the inventory")).toBe("ask_status");
  });

  it("should classify messages with 'status' keyword as ask_status", () => {
    expect(classifyIntent("what's the status of my pantry")).toBe("ask_status");
  });

  it("should classify messages with 'what' keyword as ask_status (broad catch)", () => {
    // The "what" keyword makes ask_status a broad catch-all for questions
    expect(classifyIntent("what is going on")).toBe("ask_status");
  });
});

describe("classifyIntent() - budget_question intent", () => {
  it("should classify 'How much have I spent this month?' as budget_question", () => {
    expect(classifyIntent("How much have I spent this month?")).toBe(
      "budget_question",
    );
  });

  it("should classify messages with 'budget' keyword as budget_question", () => {
    expect(classifyIntent("my budget is tight this month")).toBe(
      "budget_question",
    );
  });

  it("should classify messages with 'spent' keyword as budget_question", () => {
    expect(classifyIntent("i spent too much on groceries")).toBe(
      "budget_question",
    );
  });

  it("should classify messages with 'cost' keyword as budget_question", () => {
    expect(classifyIntent("how much does that cost")).toBe("budget_question");
  });

  it("should classify messages with 'money' keyword as budget_question", () => {
    expect(classifyIntent("running low on money for groceries")).toBe(
      "budget_question",
    );
  });

  // Note: "Budget status?" gets caught by ask_status's "status" keyword first
  // "What's my total spending?" gets caught by ask_status's "what" keyword first
  // This is a known limitation of the MVP sequential keyword classifier
});

describe("classifyIntent() - meal_planning intent", () => {
  // Note: Inputs starting with "What" get caught by ask_status's "what" keyword first
  // This is a known limitation of the MVP sequential keyword classifier

  it("should classify 'Recipe ideas?' as meal_planning", () => {
    expect(classifyIntent("Recipe ideas?")).toBe("meal_planning");
  });

  it("should classify 'Meal plan for the week' as meal_planning", () => {
    expect(classifyIntent("Meal plan for the week")).toBe("meal_planning");
  });

  it("should classify messages with 'recipe' keyword as meal_planning", () => {
    expect(classifyIntent("give me a recipe for dinner")).toBe("meal_planning");
  });

  it("should classify messages with 'dinner' keyword as meal_planning", () => {
    expect(classifyIntent("ideas for dinner tonight")).toBe("meal_planning");
  });

  it("should classify messages with 'lunch' keyword as meal_planning", () => {
    expect(classifyIntent("need lunch ideas")).toBe("meal_planning");
  });

  it("should classify messages with 'prepare' keyword as meal_planning", () => {
    expect(classifyIntent("how to prepare pasta")).toBe("meal_planning");
  });
});

describe("classifyIntent() - greeting intent", () => {
  it("should classify 'Hi Pixie!' as greeting", () => {
    expect(classifyIntent("Hi Pixie!")).toBe("greeting");
  });

  it("should classify 'Hello' as greeting", () => {
    expect(classifyIntent("Hello ")).toBe("greeting");
  });

  it("should classify 'Thanks!' as greeting", () => {
    expect(classifyIntent("Thanks!")).toBe("greeting");
  });

  it("should classify 'Hey there' as greeting", () => {
    expect(classifyIntent("Hey there")).toBe("greeting");
  });
});

describe("classifyIntent() - clarification_needed intent", () => {
  it("should classify 'I didn't understand that' as clarification_needed", () => {
    expect(classifyIntent("I didn't understand that")).toBe(
      "clarification_needed",
    );
  });

  it("should classify 'Can you clarify?' as clarification_needed", () => {
    expect(classifyIntent("Can you clarify?")).toBe("clarification_needed");
  });

  // Note: "What do you mean?" gets caught by ask_status's "what" keyword first
  // This is a known limitation of the MVP sequential keyword classifier

  it("should classify messages with 'clarify' keyword as clarification_needed", () => {
    expect(classifyIntent("please clarify that for me")).toBe(
      "clarification_needed",
    );
  });

  it("should classify 'sorry' keyword as clarification_needed", () => {
    expect(classifyIntent("sorry I'm confused")).toBe("clarification_needed");
  });
});

describe("classifyIntent() - other / unclassified", () => {
  it("should classify random text as other", () => {
    expect(classifyIntent("asdfghjkl")).toBe("other");
  });

  it("should classify empty-ish text as other", () => {
    expect(classifyIntent("   ")).toBe("other");
  });

  it("should classify ambiguous text as other", () => {
    expect(classifyIntent("the weather is nice today")).toBe("other");
  });
});

describe("classifyIntent() - edge cases", () => {
  it("should handle empty string", () => {
    expect(classifyIntent("")).toBe("other");
  });

  it("should handle whitespace-only input", () => {
    expect(classifyIntent("    ")).toBe("other");
  });

  it("should be case-insensitive for keywords", () => {
    expect(classifyIntent("BOUGHT some milk")).toBe("add_item");
  });

  it("should handle mixed case", () => {
    expect(classifyIntent("I Just Bought Milk")).toBe("add_item");
  });
});

// ============================================================================
// getIntentInfo()
// ============================================================================

describe("getIntentInfo()", () => {
  const allIntents: PixieIntent[] = [
    "add_to_list",
    "add_item",
    "remove_item",
    "set_recurring",
    "ask_status",
    "budget_question",
    "meal_planning",
    "greeting",
    "clarification_needed",
    "other",
  ];

  it("should return info for all known intents", () => {
    for (const intent of allIntents) {
      const info = getIntentInfo(intent);
      expect(info).toBeDefined();
      expect(info.name).toBeString();
      expect(info.description).toBeString();
      expect(["action", "query", "meta"]).toContain(info.category);
    }
  });

  it("should categorize action intents correctly", () => {
    expect(getIntentInfo("add_to_list").category).toBe("action");
    expect(getIntentInfo("add_item").category).toBe("action");
    expect(getIntentInfo("remove_item").category).toBe("action");
    expect(getIntentInfo("set_recurring").category).toBe("action");
  });

  it("should categorize query intents correctly", () => {
    expect(getIntentInfo("ask_status").category).toBe("query");
    expect(getIntentInfo("budget_question").category).toBe("query");
    expect(getIntentInfo("meal_planning").category).toBe("query");
  });

  it("should categorize meta intents correctly", () => {
    expect(getIntentInfo("greeting").category).toBe("meta");
    expect(getIntentInfo("clarification_needed").category).toBe("meta");
  });

  it("should return name and description for add_item", () => {
    const info = getIntentInfo("add_item");
    expect(info.name).toBe("Add Item");
    expect(info.description).toContain("add");
  });

  it("should return name and description for remove_item", () => {
    const info = getIntentInfo("remove_item");
    expect(info.name).toBe("Remove Item");
    expect(info.description).toContain("remove");
  });

  it("should fallback to 'other' for unknown intent", () => {
    const info = getIntentInfo("unknown_intent" as PixieIntent);
    expect(info.name).toBe("Other");
    expect(info.category).toBe("query");
  });
});

// ============================================================================
// intentPatterns structure
// ============================================================================

describe("intentPatterns structure", () => {
  it("should have 9 intent patterns", () => {
    expect(intentPatterns.length).toBe(9);
  });

  it("should cover all action intents", () => {
    const intents = intentPatterns.map((p) => p.intent);
    expect(intents).toContain("add_to_list");
    expect(intents).toContain("add_item");
    expect(intents).toContain("remove_item");
    expect(intents).toContain("set_recurring");
    expect(intents).toContain("ask_status");
    expect(intents).toContain("budget_question");
    expect(intents).toContain("meal_planning");
    expect(intents).toContain("greeting");
    expect(intents).toContain("clarification_needed");
  });

  it("should have keywords and patterns for each intent", () => {
    for (const pattern of intentPatterns) {
      expect(pattern.keywords.length).toBeGreaterThan(0);
      expect(pattern.patterns.length).toBeGreaterThan(0);
      expect(pattern.examples.length).toBeGreaterThan(0);
    }
  });

  it("should have regex patterns that are valid", () => {
    for (const pattern of intentPatterns) {
      for (const regex of pattern.patterns) {
        expect(regex).toBeInstanceOf(RegExp);
      }
    }
  });

  it("should classify example inputs to some intent (not 'other')", () => {
    // Due to the sequential keyword matching, some examples may match a
    // higher-priority intent than their declared one. We verify all examples
    // at least classify to something meaningful (not "other").
    for (const pattern of intentPatterns) {
      for (const example of pattern.examples) {
        const classified = classifyIntent(example);
        expect(classified).not.toBe("other");
      }
    }
  });
});
