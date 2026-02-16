/**
 * Unit tests for Pixie prompts and personality system
 * Tests generateSystemPrompt(), getWelcomeMessage(), response templates — pure functions, no DB
 */

import { describe, it, expect } from "bun:test";
import {
  PIXIE_SYSTEM_PROMPT,
  generateSystemPrompt,
  getWelcomeMessage,
  conversationStarters,
  encouragingMessages,
  responseTemplates,
} from "../prompts";

// ============================================================================
// PIXIE_SYSTEM_PROMPT constant
// ============================================================================

describe("PIXIE_SYSTEM_PROMPT", () => {
  it("should be a non-empty string", () => {
    expect(PIXIE_SYSTEM_PROMPT).toBeString();
    expect(PIXIE_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("should contain Pixie's name", () => {
    expect(PIXIE_SYSTEM_PROMPT).toContain("Pixie");
  });

  it("should define personality traits", () => {
    expect(PIXIE_SYSTEM_PROMPT).toContain("Warm");
    expect(PIXIE_SYSTEM_PROMPT).toContain("Witty");
    expect(PIXIE_SYSTEM_PROMPT).toContain("Practical");
  });

  it("should describe what Pixie helps with", () => {
    expect(PIXIE_SYSTEM_PROMPT).toContain("Adding items");
    expect(PIXIE_SYSTEM_PROMPT).toContain("grocery lists");
  });

  it("should describe what Pixie doesn't do", () => {
    expect(PIXIE_SYSTEM_PROMPT).toContain("medical");
    expect(PIXIE_SYSTEM_PROMPT).toContain("allergies");
  });
});

// ============================================================================
// generateSystemPrompt()
// ============================================================================

describe("generateSystemPrompt() - no preferences", () => {
  it("should return base prompt when called with no args", () => {
    const prompt = generateSystemPrompt();
    expect(prompt).toBe(PIXIE_SYSTEM_PROMPT);
  });

  it("should return base prompt when called with empty object", () => {
    const prompt = generateSystemPrompt({});
    expect(prompt).toBe(PIXIE_SYSTEM_PROMPT);
  });
});

describe("generateSystemPrompt() - with name", () => {
  it("should include user name in prompt", () => {
    const prompt = generateSystemPrompt({ name: "Alex" });
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("name is Alex");
  });

  it("should not include name section when name is undefined", () => {
    const basePrompt = generateSystemPrompt();
    const noNamePrompt = generateSystemPrompt({ name: undefined });
    expect(noNamePrompt).toBe(basePrompt);
  });
});

describe("generateSystemPrompt() - with dietary restrictions", () => {
  it("should include single dietary restriction", () => {
    const prompt = generateSystemPrompt({
      dietaryRestrictions: ["vegetarian"],
    });
    expect(prompt).toContain("vegetarian");
    expect(prompt).toContain("dietary restrictions");
  });

  it("should include multiple dietary restrictions", () => {
    const prompt = generateSystemPrompt({
      dietaryRestrictions: ["vegan", "gluten-free", "nut allergy"],
    });
    expect(prompt).toContain("vegan");
    expect(prompt).toContain("gluten-free");
    expect(prompt).toContain("nut allergy");
  });

  it("should not include dietary section when array is empty", () => {
    const basePrompt = generateSystemPrompt();
    const emptyPrompt = generateSystemPrompt({ dietaryRestrictions: [] });
    expect(emptyPrompt).toBe(basePrompt);
  });
});

describe("generateSystemPrompt() - with cooking skill level", () => {
  it("should add beginner context", () => {
    const prompt = generateSystemPrompt({ cookingSkillLevel: "beginner" });
    expect(prompt).toContain("new to cooking");
    expect(prompt).toContain("simple");
  });

  it("should add intermediate context", () => {
    const prompt = generateSystemPrompt({ cookingSkillLevel: "intermediate" });
    expect(prompt).toContain("some cooking experience");
  });

  it("should add advanced context", () => {
    const prompt = generateSystemPrompt({ cookingSkillLevel: "advanced" });
    expect(prompt).toContain("experienced cook");
    expect(prompt).toContain("complex");
  });
});

describe("generateSystemPrompt() - with budget consciousness", () => {
  it("should add high budget context", () => {
    const prompt = generateSystemPrompt({ budgetConsciousness: "high" });
    expect(prompt).toContain("budget-conscious");
    expect(prompt).toContain("cost-effectiveness");
  });

  it("should add low budget context", () => {
    const prompt = generateSystemPrompt({ budgetConsciousness: "low" });
    expect(prompt).toContain("premium");
  });

  it("should not add budget context for medium", () => {
    const basePrompt = generateSystemPrompt();
    const mediumPrompt = generateSystemPrompt({
      budgetConsciousness: "medium",
    });
    expect(mediumPrompt).toBe(basePrompt);
  });
});

describe("generateSystemPrompt() - with home size", () => {
  it("should include household size", () => {
    const prompt = generateSystemPrompt({ homeSize: 4 });
    expect(prompt).toContain("4 people");
    expect(prompt).toContain("household size");
  });

  it("should handle single person household", () => {
    const prompt = generateSystemPrompt({ homeSize: 1 });
    expect(prompt).toContain("1 people");
  });
});

describe("generateSystemPrompt() - combined preferences", () => {
  it("should include all preferences when all provided", () => {
    const prompt = generateSystemPrompt({
      name: "Sam",
      dietaryRestrictions: ["vegetarian"],
      cookingSkillLevel: "intermediate",
      budgetConsciousness: "high",
      homeSize: 3,
    });

    expect(prompt).toContain("Sam");
    expect(prompt).toContain("vegetarian");
    expect(prompt).toContain("some cooking experience");
    expect(prompt).toContain("budget-conscious");
    expect(prompt).toContain("3 people");
  });

  it("should always start with base prompt", () => {
    const prompt = generateSystemPrompt({
      name: "Test",
      dietaryRestrictions: ["keto"],
      cookingSkillLevel: "advanced",
      budgetConsciousness: "high",
      homeSize: 2,
    });

    expect(prompt.startsWith(PIXIE_SYSTEM_PROMPT)).toBe(true);
  });
});

// ============================================================================
// getWelcomeMessage()
// ============================================================================

describe("getWelcomeMessage()", () => {
  it("should include user name", () => {
    const message = getWelcomeMessage("Alex");
    expect(message).toContain("Alex");
  });

  it("should introduce Pixie", () => {
    const message = getWelcomeMessage("Test");
    expect(message).toContain("Pixie");
  });

  it("should be friendly and inviting", () => {
    const message = getWelcomeMessage("User");
    expect(message.length).toBeGreaterThan(50);
    // Should mention what the user can do
    expect(message).toContain("pantry");
  });

  it("should handle different names", () => {
    const msg1 = getWelcomeMessage("Alice");
    const msg2 = getWelcomeMessage("Bob");
    expect(msg1).toContain("Alice");
    expect(msg2).toContain("Bob");
    expect(msg1).not.toBe(msg2);
  });
});

// ============================================================================
// conversationStarters
// ============================================================================

describe("conversationStarters", () => {
  it("should be a non-empty array", () => {
    expect(Array.isArray(conversationStarters)).toBe(true);
    expect(conversationStarters.length).toBeGreaterThan(0);
  });

  it("should contain string starters", () => {
    for (const starter of conversationStarters) {
      expect(starter).toBeString();
      expect(starter.length).toBeGreaterThan(10);
    }
  });

  it("should have at least 3 starters for variety", () => {
    expect(conversationStarters.length).toBeGreaterThanOrEqual(3);
  });

  it("should all be unique", () => {
    const unique = new Set(conversationStarters);
    expect(unique.size).toBe(conversationStarters.length);
  });
});

// ============================================================================
// encouragingMessages
// ============================================================================

describe("encouragingMessages", () => {
  it("should have message for organized pantry", () => {
    expect(encouragingMessages.organizedPantry).toBeString();
    expect(encouragingMessages.organizedPantry.length).toBeGreaterThan(0);
  });

  it("should have message for budget on track", () => {
    expect(encouragingMessages.budgetOnTrack).toBeString();
  });

  it("should have message for budget at risk", () => {
    expect(encouragingMessages.budgetAtRisk).toBeString();
  });

  it("should have message for expiring soon", () => {
    expect(encouragingMessages.expiringSoon).toBeString();
  });

  it("should have message for empty pantry", () => {
    expect(encouragingMessages.emptyPantry).toBeString();
  });

  it("should have message for new user", () => {
    expect(encouragingMessages.newUser).toBeString();
  });
});

// ============================================================================
// responseTemplates
// ============================================================================

describe("responseTemplates", () => {
  it("should format itemAdded correctly", () => {
    const result = responseTemplates.itemAdded("Eggs", 12, "dozen");
    expect(result).toContain("Eggs");
    expect(result).toContain("12");
    expect(result).toContain("dozen");
  });

  it("should format itemRemoved correctly", () => {
    const result = responseTemplates.itemRemoved("Milk");
    expect(result).toContain("Milk");
    expect(result).toContain("Removed");
  });

  it("should format recurringSet correctly", () => {
    const result = responseTemplates.recurringSet("Coffee", "weekly");
    expect(result).toContain("Coffee");
    expect(result).toContain("weekly");
    expect(result).toContain("recurring");
  });

  it("should format budgetStatus correctly", () => {
    const result = responseTemplates.budgetStatus(150, 500, 30);
    expect(result).toContain("150");
    expect(result).toContain("500");
    expect(result).toContain("30%");
  });

  it("should format noInventory correctly", () => {
    const result = responseTemplates.noInventory("Bread");
    expect(result).toContain("Bread");
    expect(result).toContain("out of");
  });

  it("should format helpfulSuggestion correctly", () => {
    const result = responseTemplates.helpfulSuggestion(
      "Try freezing the extra berries",
    );
    expect(result).toContain("Try freezing the extra berries");
  });
});
