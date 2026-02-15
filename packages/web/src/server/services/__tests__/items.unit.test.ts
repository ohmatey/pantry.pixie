/**
 * Unit tests for items service
 * Tests CRUD operations, filtering, search, and stats
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { seedTestUser, TEST_EMAIL, TEST_PASSWORD } from "@pantry-pixie/core";
import { db, eq, itemsTable } from "@pantry-pixie/core";
import {
  addItem,
  listItems,
  getItem,
  updateItem,
  removeItem,
  findItemByName,
  toggleItemCheck,
  getStats,
  type AddItemData,
  type UpdateItemData,
} from "../items";

let testHomeId: string;
let createdItemIds: string[] = [];

beforeAll(async () => {
  const seed = await seedTestUser();
  testHomeId = seed.home.id;
});

afterAll(async () => {
  // Clean up created items
  if (createdItemIds.length > 0) {
    for (const id of createdItemIds) {
      await db.delete(itemsTable).where(eq(itemsTable.id, id));
    }
  }
});

describe("Items Service - addItem()", () => {
  it("should add a new item with all fields", async () => {
    const data: AddItemData = {
      name: "Organic Eggs",
      quantity: 12,
      unit: "dozen",
      category: "dairy",
      location: "Fridge",
      notes: "Free range",
      price: "4.99",
    };

    const item = await addItem(testHomeId, data);
    createdItemIds.push(item.id);

    expect(item.id).toBeString();
    expect(item.homeId).toBe(testHomeId);
    expect(item.name).toBe("Organic Eggs");
    expect(item.quantity).toBe(12);
    expect(item.unit).toBe("dozen");
    expect(item.category).toBe("dairy");
    expect(item.location).toBe("Fridge");
    expect(item.notes).toBe("Free range");
    expect(item.price).toBe("4.99");
    expect(item.isChecked).toBe(false);
  });

  it("should add item with minimal fields using defaults", async () => {
    const data: AddItemData = {
      name: "Milk",
    };

    const item = await addItem(testHomeId, data);
    createdItemIds.push(item.id);

    expect(item.name).toBe("Milk");
    expect(item.quantity).toBe(1); // default
    expect(item.unit).toBe("piece"); // default
    expect(item.category).toBe("other"); // default
    expect(item.isChecked).toBe(false);
  });

  it("should add item with custom quantity and unit", async () => {
    const data: AddItemData = {
      name: "Rice",
      quantity: 5,
      unit: "kg",
      category: "grains",
    };

    const item = await addItem(testHomeId, data);
    createdItemIds.push(item.id);

    expect(item.name).toBe("Rice");
    expect(item.quantity).toBe(5);
    expect(item.unit).toBe("kg");
    expect(item.category).toBe("grains");
  });

  it("should add item with expiration date", async () => {
    const expiresAt = new Date("2026-03-01");
    const data: AddItemData = {
      name: "Yogurt",
      category: "dairy",
      expiresAt,
    };

    const item = await addItem(testHomeId, data);
    createdItemIds.push(item.id);

    expect(item.name).toBe("Yogurt");
    expect(item.expiresAt).toEqual(expiresAt);
  });
});

describe("Items Service - listItems()", () => {
  let testItems: string[] = [];

  beforeAll(async () => {
    // Create test items with different categories
    const items = [
      { name: "Apples", category: "produce", quantity: 6 },
      { name: "Bread", category: "bakery", quantity: 1 },
      { name: "Cheese", category: "dairy", quantity: 1 },
      { name: "Chicken", category: "protein", quantity: 2 },
    ];

    for (const itemData of items) {
      const item = await addItem(testHomeId, itemData);
      testItems.push(item.id);
      createdItemIds.push(item.id);
    }
  });

  it("should list all items for a home", async () => {
    const items = await listItems(testHomeId);

    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.every((i) => i.homeId === testHomeId)).toBe(true);
  });

  it("should filter items by category", async () => {
    const items = await listItems(testHomeId, { category: "dairy" });

    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((i) => i.category === "dairy")).toBe(true);
  });

  it("should search items by name", async () => {
    const items = await listItems(testHomeId, { search: "Apples" });

    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.some((i) => i.name.toLowerCase().includes("apples"))).toBe(true);
  });

  it("should search items case-insensitively", async () => {
    const items = await listItems(testHomeId, { search: "BREAD" });

    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.some((i) => i.name.toLowerCase().includes("bread"))).toBe(true);
  });

  it("should filter by isChecked status", async () => {
    // Toggle one item to checked
    await toggleItemCheck(testHomeId, testItems[0]);

    const checkedItems = await listItems(testHomeId, { isChecked: true });
    const uncheckedItems = await listItems(testHomeId, { isChecked: false });

    expect(checkedItems.some((i) => i.id === testItems[0])).toBe(true);
    expect(uncheckedItems.every((i) => i.id !== testItems[0])).toBe(true);

    // Toggle back
    await toggleItemCheck(testHomeId, testItems[0]);
  });

  it("should combine multiple filters", async () => {
    const items = await listItems(testHomeId, {
      category: "produce",
      search: "app",
    });

    expect(items.every((i) => i.category === "produce")).toBe(true);
    expect(items.every((i) => i.name.toLowerCase().includes("app"))).toBe(true);
  });
});

describe("Items Service - getItem()", () => {
  let itemId: string;

  beforeAll(async () => {
    const item = await addItem(testHomeId, { name: "Test Item" });
    itemId = item.id;
    createdItemIds.push(itemId);
  });

  it("should get item by ID", async () => {
    const item = await getItem(testHomeId, itemId);

    expect(item).toBeDefined();
    expect(item!.id).toBe(itemId);
    expect(item!.name).toBe("Test Item");
  });

  it("should return undefined for non-existent item", async () => {
    const item = await getItem(testHomeId, "00000000-0000-0000-0000-000000000000");

    expect(item).toBeUndefined();
  });

  it("should return undefined for item from different home", async () => {
    const item = await getItem("00000000-0000-0000-0000-000000000000", itemId);

    expect(item).toBeUndefined();
  });
});

describe("Items Service - updateItem()", () => {
  let itemId: string;

  beforeAll(async () => {
    const item = await addItem(testHomeId, {
      name: "Original Name",
      quantity: 1,
      category: "other",
    });
    itemId = item.id;
    createdItemIds.push(itemId);
  });

  it("should update item name", async () => {
    const updated = await updateItem(testHomeId, itemId, { name: "Updated Name" });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.quantity).toBe(1); // unchanged
  });

  it("should update item quantity and unit", async () => {
    const updated = await updateItem(testHomeId, itemId, {
      quantity: 5,
      unit: "kg",
    });

    expect(updated).toBeDefined();
    expect(updated!.quantity).toBe(5);
    expect(updated!.unit).toBe("kg");
  });

  it("should update item category", async () => {
    const updated = await updateItem(testHomeId, itemId, {
      category: "produce",
    });

    expect(updated).toBeDefined();
    expect(updated!.category).toBe("produce");
  });

  it("should update multiple fields at once", async () => {
    const updates: UpdateItemData = {
      name: "Multi Update",
      quantity: 10,
      unit: "pieces",
      category: "household",
      notes: "Updated notes",
    };

    const updated = await updateItem(testHomeId, itemId, updates);

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Multi Update");
    expect(updated!.quantity).toBe(10);
    expect(updated!.unit).toBe("pieces");
    expect(updated!.category).toBe("household");
    expect(updated!.notes).toBe("Updated notes");
  });

  it("should return undefined when updating non-existent item", async () => {
    const updated = await updateItem(testHomeId, "00000000-0000-0000-0000-000000000000", {
      name: "No Item",
    });

    expect(updated).toBeUndefined();
  });

});

describe("Items Service - removeItem()", () => {
  it("should remove item and return it", async () => {
    const item = await addItem(testHomeId, { name: "To Delete" });
    const itemId = item.id;

    const removed = await removeItem(testHomeId, itemId);

    expect(removed).toBeDefined();
    expect(removed!.id).toBe(itemId);
    expect(removed!.name).toBe("To Delete");

    // Verify it's deleted
    const found = await getItem(testHomeId, itemId);
    expect(found).toBeUndefined();
  });

  it("should return undefined when removing non-existent item", async () => {
    const removed = await removeItem(testHomeId, "00000000-0000-0000-0000-000000000000");

    expect(removed).toBeUndefined();
  });

  it("should not remove item from different home", async () => {
    const item = await addItem(testHomeId, { name: "Safe Item" });
    createdItemIds.push(item.id);

    const removed = await removeItem("00000000-0000-0000-0000-000000000000", item.id);

    expect(removed).toBeUndefined();

    // Verify it still exists
    const found = await getItem(testHomeId, item.id);
    expect(found).toBeDefined();
  });
});

describe("Items Service - findItemByName()", () => {
  beforeAll(async () => {
    const item = await addItem(testHomeId, { name: "Special Bananas" });
    createdItemIds.push(item.id);
  });

  it("should find item by exact name", async () => {
    const item = await findItemByName(testHomeId, "Special Bananas");

    expect(item).toBeDefined();
    expect(item!.name).toBe("Special Bananas");
  });

  it("should find item by partial name (case-insensitive)", async () => {
    const item = await findItemByName(testHomeId, "banana");

    expect(item).toBeDefined();
    expect(item!.name.toLowerCase()).toContain("banana");
  });

  it("should return undefined for non-existent item name", async () => {
    const item = await findItemByName(testHomeId, "NonExistentItemXYZ");

    expect(item).toBeUndefined();
  });
});

describe("Items Service - toggleItemCheck()", () => {
  it("should toggle item from unchecked to checked", async () => {
    const item = await addItem(testHomeId, { name: "Toggle Test 1" });
    createdItemIds.push(item.id);

    const toggled = await toggleItemCheck(testHomeId, item.id);

    expect(toggled).toBeDefined();
    expect(toggled!.isChecked).toBe(true);
  });

  it("should toggle item from checked to unchecked", async () => {
    const item = await addItem(testHomeId, { name: "Toggle Test 2" });
    createdItemIds.push(item.id);

    // First check it
    await toggleItemCheck(testHomeId, item.id);

    // Then uncheck it
    const toggled = await toggleItemCheck(testHomeId, item.id);

    expect(toggled).toBeDefined();
    expect(toggled!.isChecked).toBe(false);
  });

  it("should return undefined when toggling non-existent item", async () => {
    const toggled = await toggleItemCheck(testHomeId, "00000000-0000-0000-0000-000000000000");

    expect(toggled).toBeUndefined();
  });
});

describe("Items Service - getStats()", () => {
  let statsTestItems: string[] = [];

  beforeAll(async () => {
    // Create items in different categories with different checked states
    const items = [
      { name: "Stats Apple", category: "produce" },
      { name: "Stats Banana", category: "produce" },
      { name: "Stats Bread", category: "bakery" },
      { name: "Stats Milk", category: "dairy" },
      { name: "Stats Cheese", category: "dairy" },
    ];

    for (const itemData of items) {
      const item = await addItem(testHomeId, itemData);
      statsTestItems.push(item.id);
      createdItemIds.push(item.id);
    }

    // Check some items
    await toggleItemCheck(testHomeId, statsTestItems[0]); // Apple - checked
    await toggleItemCheck(testHomeId, statsTestItems[2]); // Bread - checked
  });

  it("should return total item count", async () => {
    const stats = await getStats(testHomeId);

    expect(stats.total).toBeGreaterThanOrEqual(5);
  });

  it("should return checked and unchecked counts", async () => {
    const stats = await getStats(testHomeId);

    expect(stats.checked).toBeGreaterThanOrEqual(2);
    expect(stats.unchecked).toBeGreaterThanOrEqual(3);
    expect(stats.checked + stats.unchecked).toBe(stats.total);
  });

  it("should group stats by category", async () => {
    const stats = await getStats(testHomeId);

    expect(stats.byCategory).toBeDefined();
    expect(stats.byCategory.produce).toBeDefined();
    expect(stats.byCategory.produce.total).toBeGreaterThanOrEqual(2);
    expect(stats.byCategory.produce.checked).toBeGreaterThanOrEqual(1);
  });

  it("should have accurate category totals", async () => {
    const stats = await getStats(testHomeId);

    expect(stats.byCategory.dairy).toBeDefined();
    expect(stats.byCategory.dairy.total).toBeGreaterThanOrEqual(2);
    expect(stats.byCategory.dairy.checked).toBe(0); // none checked

    expect(stats.byCategory.bakery).toBeDefined();
    expect(stats.byCategory.bakery.total).toBeGreaterThanOrEqual(1);
    expect(stats.byCategory.bakery.checked).toBeGreaterThanOrEqual(1); // Bread checked
  });

  it("should include uncategorized items in 'other'", async () => {
    // Add item without category
    const item = await addItem(testHomeId, { name: "Uncategorized" });
    createdItemIds.push(item.id);

    const stats = await getStats(testHomeId);

    expect(stats.byCategory.other).toBeDefined();
    expect(stats.byCategory.other.total).toBeGreaterThanOrEqual(1);
  });
});
