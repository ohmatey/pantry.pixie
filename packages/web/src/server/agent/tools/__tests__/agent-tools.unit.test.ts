/**
 * Unit tests for AI agent tools
 * Tests tool structure and factory pattern (execution tested via E2E)
 */

import { describe, it, expect, beforeAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import { createAddItemTool } from "../add-item";
import { createListItemsTool } from "../list-items";
import { createRemoveItemTool } from "../remove-item";
import { createCheckItemTool } from "../check-item";
import { createSetRecurringTool } from "../set-recurring";
import { shouldSkipDatabaseTests } from "../../../__tests__/test-helpers";

// Skip all tests if DATABASE_URL is not set
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Agent tools tests require DATABASE_URL to be set", () => {});
} else {
  let testHomeId: string;

  beforeAll(async () => {
    const seed = await seedTestUser();
    testHomeId = seed.home.id;
  });

  describe("Agent Tools - Tool Structure", () => {
  it("should create add-item tool with correct structure", () => {
    const tool = createAddItemTool(testHomeId);

    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("execute");
    expect(tool.description).toBeString();
    expect(tool.description).toContain("Add");
    expect(typeof tool.execute).toBe("function");
  });

  it("should create list-items tool with correct structure", () => {
    const tool = createListItemsTool(testHomeId);

    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("execute");
    expect(tool.description).toContain("List");
  });

  it("should create remove-item tool with correct structure", () => {
    const tool = createRemoveItemTool(testHomeId);

    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("execute");
    expect(tool.description).toContain("Remove");
  });

  it("should create check-item tool with correct structure", () => {
    const tool = createCheckItemTool(testHomeId);

    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("execute");
    expect(tool.description).toContain("Check");
  });

  it("should create set-recurring tool with correct structure", () => {
    const tool = createSetRecurringTool(testHomeId);

    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("execute");
    expect(tool.description).toContain("recurring");
  });
});

describe("Agent Tools - Tool Factory Pattern", () => {
  it("should create tools scoped to specific home", () => {
    const tool1 = createAddItemTool("home-1");
    const tool2 = createAddItemTool("home-2");

    expect(tool1).toBeDefined();
    expect(tool2).toBeDefined();
    expect(tool1).not.toBe(tool2);
    expect(tool1.description).toBe(tool2.description); // same description
  });

  it("should create all five tool types", () => {
    const tools = [
      createAddItemTool(testHomeId),
      createListItemsTool(testHomeId),
      createRemoveItemTool(testHomeId),
      createCheckItemTool(testHomeId),
      createSetRecurringTool(testHomeId),
    ];

    expect(tools.length).toBe(5);
    expect(
      tools.every((t) => t && t.description && t.inputSchema && t.execute),
    ).toBe(true);
  });

  it("should have unique descriptions for each tool", () => {
    const addTool = createAddItemTool(testHomeId);
    const listTool = createListItemsTool(testHomeId);
    const removeTool = createRemoveItemTool(testHomeId);
    const checkTool = createCheckItemTool(testHomeId);
    const recurringTool = createSetRecurringTool(testHomeId);

    const descriptions = [
      addTool.description,
      listTool.description,
      removeTool.description,
      checkTool.description,
      recurringTool.description,
    ];

    // All descriptions should be unique
    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(5);
  });
});

describe("Agent Tools - Parameters Schema", () => {
  it("should have zod inputSchema for add-item", () => {
    const tool = createAddItemTool(testHomeId);

    expect(tool.inputSchema).toBeDefined();
    expect(typeof tool.inputSchema).toBe("object");
    // Zod schemas have _def property
    expect(tool.inputSchema).toHaveProperty("_def");
  });

  it("should have zod inputSchema for list-items", () => {
    const tool = createListItemsTool(testHomeId);

    expect(tool.inputSchema).toBeDefined();
    expect(typeof tool.inputSchema).toBe("object");
    expect(tool.inputSchema).toHaveProperty("_def");
  });

  it("should have zod inputSchema for all tools", () => {
    const tools = [
      createAddItemTool(testHomeId),
      createListItemsTool(testHomeId),
      createRemoveItemTool(testHomeId),
      createCheckItemTool(testHomeId),
      createSetRecurringTool(testHomeId),
    ];

    for (const tool of tools) {
      expect(tool.inputSchema).toHaveProperty("_def");
    }
  });
});

describe("Agent Tools - Tool Descriptions", () => {
  it("should have clear, action-oriented descriptions", () => {
    const addTool = createAddItemTool(testHomeId);
    const listTool = createListItemsTool(testHomeId);
    const removeTool = createRemoveItemTool(testHomeId);
    const checkTool = createCheckItemTool(testHomeId);
    const recurringTool = createSetRecurringTool(testHomeId);

    // Descriptions should explain when to use the tool
    expect(addTool.description.length).toBeGreaterThan(20);
    expect(listTool.description.length).toBeGreaterThan(20);
    expect(removeTool.description.length).toBeGreaterThan(20);
    expect(checkTool.description.length).toBeGreaterThan(20);
    expect(recurringTool.description.length).toBeGreaterThan(20);
  });

  it("should mention key use cases in descriptions", () => {
    const addTool = createAddItemTool(testHomeId);
    const listTool = createListItemsTool(testHomeId);

    // Add tool should mention adding/buying
    expect(
      addTool.description.toLowerCase().includes("add") ||
        addTool.description.toLowerCase().includes("bought"),
    ).toBe(true);

    // List tool should mention listing/checking
    expect(
      listTool.description.toLowerCase().includes("list") ||
        listTool.description.toLowerCase().includes("inventory"),
    ).toBe(true);
  });
});

} // end of else block (skipTests check)
