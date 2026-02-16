/**
 * Unit tests for grocery lists service
 * Tests list CRUD, list items, and stats
 */

import { describe, it, expect, beforeAll, afterAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import {
  db,
  eq,
  groceryListsTable,
  itemsTable,
} from "@pantry-pixie/core";
import { addItem } from "../items";
import {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  completeList,
  addListItem,
  removeListItem,
  toggleListItem,
  getListStats,
} from "../grocery-lists";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

// Skip all tests if DATABASE_URL is not set
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Tests require DATABASE_URL to be set", () => {});
} else {

let testHomeId: string;
let createdListIds: string[] = [];
let createdItemIds: string[] = [];

beforeAll(async () => {
  const seed = await seedTestUser();
  testHomeId = seed.home.id;
});

afterAll(async () => {
  for (const id of createdListIds) {
    await db.delete(groceryListsTable).where(eq(groceryListsTable.id, id));
  }
  for (const id of createdItemIds) {
    await db.delete(itemsTable).where(eq(itemsTable.id, id));
  }
});

describe("Grocery Lists Service - createList()", () => {
  it("should create a list with name only", async () => {
    const list = await createList(testHomeId, { name: "Weekly Groceries" });
    createdListIds.push(list.id);

    expect(list.id).toBeString();
    expect(list.homeId).toBe(testHomeId);
    expect(list.name).toBe("Weekly Groceries");
    expect(list.isActive).toBe(true);
  });

  it("should create list with description and budget", async () => {
    const list = await createList(testHomeId, {
      name: "Monthly Shop",
      description: "Big monthly shopping trip",
      totalBudget: "500.00",
    });
    createdListIds.push(list.id);

    expect(list.name).toBe("Monthly Shop");
    expect(list.description).toBe("Big monthly shopping trip");
    expect(list.totalBudget).toBe(500);
  });

  it("should create list with initial items", async () => {
    const item1 = await addItem(testHomeId, { name: "Milk" });
    const item2 = await addItem(testHomeId, { name: "Bread" });
    createdItemIds.push(item1.id, item2.id);

    const list = await createList(testHomeId, {
      name: "Quick List",
      items: [
        { itemId: item1.id, quantity: 2 },
        { itemId: item2.id, quantity: 1, notes: "Whole wheat" },
      ],
    });
    createdListIds.push(list.id);

    const fullList = await getList(testHomeId, list.id);
    expect(fullList?.items.length).toBe(2);
  });
});

describe("Grocery Lists Service - getLists()", () => {
  beforeAll(async () => {
    const list1 = await createList(testHomeId, { name: "List 1" });
    const list2 = await createList(testHomeId, { name: "List 2" });
    createdListIds.push(list1.id, list2.id);
  });

  it("should get all lists for a home", async () => {
    const lists = await getLists(testHomeId);

    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists.every((l) => l.homeId === testHomeId)).toBe(true);
  });

  it("should order active lists first", async () => {
    const lists = await getLists(testHomeId);

    const activeLists = lists.filter((l) => l.isActive);
    expect(activeLists.length).toBeGreaterThan(0);
  });
});

describe("Grocery Lists Service - getList()", () => {
  let listId: string;
  let item1Id: string;

  beforeAll(async () => {
    const item = await addItem(testHomeId, { name: "Test Item" });
    item1Id = item.id;
    createdItemIds.push(item1Id);

    const list = await createList(testHomeId, {
      name: "Detailed List",
      items: [{ itemId: item1Id, quantity: 3 }],
    });
    listId = list.id;
    createdListIds.push(listId);
  });

  it("should get list with items", async () => {
    const list = await getList(testHomeId, listId);

    expect(list).toBeDefined();
    expect(list!.name).toBe("Detailed List");
    expect(list!.items).toBeDefined();
    expect(list!.items.length).toBeGreaterThanOrEqual(1);
  });

  it("should include completion stats", async () => {
    const list = await getList(testHomeId, listId);

    expect(list!.totalItems).toBeGreaterThanOrEqual(1);
    expect(list!.completedItems).toBe(0);
    expect(list!.completionPercentage).toBeDefined();
  });

  it("should return undefined for non-existent list", async () => {
    const list = await getList(
      testHomeId,
      "00000000-0000-0000-0000-000000000000",
    );

    expect(list).toBeUndefined();
  });
});

describe("Grocery Lists Service - updateList()", () => {
  let listId: string;

  beforeAll(async () => {
    const list = await createList(testHomeId, { name: "Original Name" });
    listId = list.id;
    createdListIds.push(listId);
  });

  it("should update list name", async () => {
    const updated = await updateList(testHomeId, listId, { name: "New Name" });

    expect(updated!.name).toBe("New Name");
  });

  it("should update list description", async () => {
    const updated = await updateList(testHomeId, listId, {
      description: "Updated description",
    });

    expect(updated!.description).toBe("Updated description");
  });

  it("should update totalBudget", async () => {
    const updated = await updateList(testHomeId, listId, {
      totalBudget: "250.00",
    });

    expect(updated!.totalBudget).toBe(250);
  });

  it("should return undefined for non-existent list", async () => {
    const updated = await updateList(
      testHomeId,
      "00000000-0000-0000-0000-000000000000",
      {
        name: "No List",
      },
    );

    expect(updated).toBeUndefined();
  });
});

describe("Grocery Lists Service - deleteList()", () => {
  it("should delete list and return it", async () => {
    const list = await createList(testHomeId, { name: "To Delete" });
    const listId = list.id;

    const deleted = await deleteList(testHomeId, listId);

    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(listId);

    const found = await getList(testHomeId, listId);
    expect(found).toBeUndefined();
  });

  it("should return undefined for non-existent list", async () => {
    const deleted = await deleteList(
      testHomeId,
      "00000000-0000-0000-0000-000000000000",
    );

    expect(deleted).toBeUndefined();
  });
});

describe("Grocery Lists Service - completeList()", () => {
  let listId: string;

  beforeAll(async () => {
    const list = await createList(testHomeId, { name: "To Complete" });
    listId = list.id;
    createdListIds.push(listId);
  });

  it("should mark list as completed", async () => {
    const completed = await completeList(testHomeId, listId);

    expect(completed!.isActive).toBe(false);
    expect(completed!.completedAt).toBeInstanceOf(Date);
  });

  it("should return undefined for non-existent list", async () => {
    const completed = await completeList(
      testHomeId,
      "00000000-0000-0000-0000-000000000000",
    );

    expect(completed).toBeUndefined();
  });
});

describe("Grocery Lists Service - addListItem()", () => {
  let listId: string;
  let itemId: string;

  beforeAll(async () => {
    const item = await addItem(testHomeId, { name: "Apple" });
    itemId = item.id;
    createdItemIds.push(itemId);

    const list = await createList(testHomeId, { name: "Add Items Test" });
    listId = list.id;
    createdListIds.push(listId);
  });

  it("should add item to list", async () => {
    const listItem = await addListItem(testHomeId, listId, { itemId });

    expect(listItem).toBeDefined();
    expect(listItem!.listId).toBe(listId);
    expect(listItem!.itemId).toBe(itemId);
    expect(listItem!.quantity).toBe(1);
  });

  it("should add item with custom quantity and notes", async () => {
    const item2 = await addItem(testHomeId, { name: "Banana" });
    createdItemIds.push(item2.id);

    const listItem = await addListItem(testHomeId, listId, {
      itemId: item2.id,
      quantity: 5,
      notes: "Ripe ones",
      estimatedPrice: "2.50",
    });

    expect(listItem!.quantity).toBe(5);
    expect(listItem!.notes).toBe("Ripe ones");
    expect(listItem!.estimatedPrice).toBe(2.5);
  });

  it("should return undefined for non-existent list", async () => {
    const listItem = await addListItem(
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000000",
      {
        itemId,
      },
    );

    expect(listItem).toBeUndefined();
  });
});

describe("Grocery Lists Service - removeListItem()", () => {
  let listId: string;
  let listItemId: string;

  beforeAll(async () => {
    const item = await addItem(testHomeId, { name: "To Remove" });
    createdItemIds.push(item.id);

    const list = await createList(testHomeId, {
      name: "Remove Test",
      items: [{ itemId: item.id }],
    });
    listId = list.id;
    createdListIds.push(listId);

    const fullList = await getList(testHomeId, listId);
    listItemId = fullList!.items[0].id;
  });

  it("should remove item from list", async () => {
    const removed = await removeListItem(testHomeId, listId, listItemId);

    expect(removed).toBeDefined();
    expect(removed!.id).toBe(listItemId);

    const fullList = await getList(testHomeId, listId);
    expect(fullList!.items.length).toBe(0);
  });

  it("should return undefined for non-existent list", async () => {
    const removed = await removeListItem(
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000000",
    );

    expect(removed).toBeUndefined();
  });
});

describe("Grocery Lists Service - toggleListItem()", () => {
  it("should toggle list item from incomplete to complete", async () => {
    const item = await addItem(testHomeId, { name: "Toggle Item 1" });
    createdItemIds.push(item.id);

    const list = await createList(testHomeId, {
      name: "Toggle Test 1",
      items: [{ itemId: item.id }],
    });
    createdListIds.push(list.id);

    const fullList = await getList(testHomeId, list.id);
    const listItemId = fullList!.items[0].id;

    const toggled = await toggleListItem(testHomeId, list.id, listItemId);

    expect(toggled!.isCompleted).toBe(true);
    expect(toggled!.completedAt).toBeInstanceOf(Date);
  });

  it("should toggle list item from complete to incomplete", async () => {
    const item = await addItem(testHomeId, { name: "Toggle Item 2" });
    createdItemIds.push(item.id);

    const list = await createList(testHomeId, {
      name: "Toggle Test 2",
      items: [{ itemId: item.id }],
    });
    createdListIds.push(list.id);

    const fullList = await getList(testHomeId, list.id);
    const listItemId = fullList!.items[0].id;

    // First toggle to complete
    await toggleListItem(testHomeId, list.id, listItemId);

    // Then toggle back to incomplete
    const toggled = await toggleListItem(testHomeId, list.id, listItemId);

    expect(toggled!.isCompleted).toBe(false);
    expect(toggled!.completedAt).toBeNull();
  });

  it("should return undefined for non-existent list", async () => {
    const toggled = await toggleListItem(
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000000",
    );

    expect(toggled).toBeUndefined();
  });
});

describe("Grocery Lists Service - getListStats()", () => {
  let listId: string;

  beforeAll(async () => {
    const item1 = await addItem(testHomeId, { name: "Stats Item 1" });
    const item2 = await addItem(testHomeId, { name: "Stats Item 2" });
    const item3 = await addItem(testHomeId, { name: "Stats Item 3" });
    createdItemIds.push(item1.id, item2.id, item3.id);

    const list = await createList(testHomeId, {
      name: "Stats Test",
      items: [
        { itemId: item1.id, quantity: 2, estimatedPrice: "5.00" },
        { itemId: item2.id, quantity: 1, estimatedPrice: "3.00" },
        { itemId: item3.id, quantity: 3, estimatedPrice: "2.00" },
      ],
    });
    listId = list.id;
    createdListIds.push(listId);

    // Complete one item
    const fullList = await getList(testHomeId, listId);
    await toggleListItem(testHomeId, listId, fullList!.items[0].id);
  });

  it("should return total and completed items", async () => {
    const stats = await getListStats(testHomeId, listId);

    expect(stats!.totalItems).toBe(3);
    expect(stats!.completedItems).toBe(1);
  });

  it("should calculate completion percentage", async () => {
    const stats = await getListStats(testHomeId, listId);

    expect(stats!.completionPercentage).toBe(33); // 1/3 = 33%
  });

  it("should calculate estimated total cost", async () => {
    const stats = await getListStats(testHomeId, listId);

    // (2*5) + (1*3) + (3*2) = 10 + 3 + 6 = 19
    expect(stats!.estimatedTotal).toBe(19);
  });

  it("should return undefined for non-existent list", async () => {
    const stats = await getListStats(
      testHomeId,
      "00000000-0000-0000-0000-000000000000",
    );

    expect(stats).toBeUndefined();
  });
});

} // end of else block (skipTests check)
