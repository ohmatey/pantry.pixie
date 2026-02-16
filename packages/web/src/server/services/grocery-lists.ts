/**
 * Grocery list service — single source of truth for list CRUD and list item operations.
 * Used by both agent tools and API handlers.
 */

import {
  db,
  eq,
  and,
  desc,
  asc,
  ilike,
  lte,
  isNotNull,
  groceryListsTable,
  listItemsTable,
  itemsTable,
  type GroceryList,
  type ListItem,
  type Item,
} from "@pantry-pixie/core";
import type { GroceryListWithItems, ListStats } from "@pantry-pixie/core";
import { eventBus } from "./events";

// ============================================================================
// Input types
// ============================================================================

export interface CreateListData {
  name: string;
  description?: string;
  totalBudget?: number;
  recurringSchedule?: string | null;
  scheduleDayOfWeek?: number | null;
  scheduleDayOfMonth?: number | null;
  items?: Array<{
    itemId: string;
    quantity?: number;
    notes?: string;
    estimatedPrice?: number;
  }>;
}

export interface UpdateListData {
  name?: string;
  description?: string;
  totalBudget?: number;
  recurringSchedule?: string | null;
  scheduleDayOfWeek?: number | null;
  scheduleDayOfMonth?: number | null;
}

export interface AddListItemData {
  itemId: string;
  quantity?: number;
  notes?: string;
  estimatedPrice?: number;
}

// ============================================================================
// Scheduling helpers
// ============================================================================

export function calculateNextResetAt(
  schedule: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const now = new Date();

  if (schedule === "weekly") {
    const target = dayOfWeek ?? 0; // default Sunday
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    const daysUntil = (target - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  if (schedule === "biweekly") {
    const target = dayOfWeek ?? 0;
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    const daysUntil = (target - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil + 7); // +7 for biweekly
    return next;
  }

  if (schedule === "monthly") {
    const target = dayOfMonth ?? 1;
    const next = new Date(
      now.getFullYear(),
      now.getMonth(),
      target,
      0,
      0,
      0,
      0,
    );
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  // Fallback: 7 days from now
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

export async function resetScheduledList(
  listId: string,
): Promise<GroceryList | undefined> {
  // Uncheck all items on the list
  await db
    .update(listItemsTable)
    .set({ isCompleted: false, completedAt: null })
    .where(eq(listItemsTable.listId, listId));

  // Get the current list to read schedule info
  const [current] = await db
    .select()
    .from(groceryListsTable)
    .where(eq(groceryListsTable.id, listId));

  if (!current) return undefined;

  const nextReset = current.recurringSchedule
    ? calculateNextResetAt(
        current.recurringSchedule,
        current.scheduleDayOfWeek,
        current.scheduleDayOfMonth,
      )
    : null;

  const [list] = await db
    .update(groceryListsTable)
    .set({
      roundNumber: current.roundNumber + 1,
      lastResetAt: new Date(),
      nextResetAt: nextReset,
    })
    .where(eq(groceryListsTable.id, listId))
    .returning();

  if (list) {
    eventBus.emit("list:updated", {
      action: "reset",
      list,
      homeId: list.homeId,
    });
  }
  return list;
}

export async function checkAndResetScheduledLists(
  homeId: string,
): Promise<void> {
  const now = new Date();

  // Find lists where nextResetAt <= now
  const dueLists = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.homeId, homeId),
        isNotNull(groceryListsTable.nextResetAt),
        lte(groceryListsTable.nextResetAt, now),
      ),
    );

  for (const list of dueLists) {
    await resetScheduledList(list.id);
  }
}

export async function getOrCreateDefaultList(
  homeId: string,
): Promise<GroceryList> {
  const [existing] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.homeId, homeId),
        eq(groceryListsTable.isDefault, true),
      ),
    );

  if (existing) return existing;

  const [created] = await db
    .insert(groceryListsTable)
    .values({
      homeId,
      name: "Quick Items",
      isDefault: true,
      isActive: true,
    })
    .returning();

  return created;
}

export async function findOrCreateItem(
  homeId: string,
  name: string,
): Promise<Item> {
  // Try to find existing item by name (case-insensitive)
  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.homeId, homeId), ilike(itemsTable.name, name)));

  if (existing) return existing;

  // Create new item
  const [created] = await db
    .insert(itemsTable)
    .values({
      homeId,
      name,
      quantity: 1,
      unit: "piece",
      category: "other",
    })
    .returning();

  eventBus.emit("inventory:updated", {
    action: "added",
    item: created,
    homeId,
  });
  return created;
}

// ============================================================================
// List CRUD
// ============================================================================

export async function createList(
  homeId: string,
  data: CreateListData,
): Promise<GroceryList> {
  const nextReset = data.recurringSchedule
    ? calculateNextResetAt(
        data.recurringSchedule,
        data.scheduleDayOfWeek,
        data.scheduleDayOfMonth,
      )
    : null;

  const [list] = await db
    .insert(groceryListsTable)
    .values({
      homeId,
      name: data.name,
      description: data.description,
      totalBudget: data.totalBudget,
      recurringSchedule: data.recurringSchedule,
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleDayOfMonth: data.scheduleDayOfMonth,
      nextResetAt: nextReset,
    })
    .returning();

  // Bulk-insert initial items if provided
  if (data.items && data.items.length > 0) {
    await db.insert(listItemsTable).values(
      data.items.map((i) => ({
        listId: list.id,
        itemId: i.itemId,
        quantity: i.quantity ?? 1,
        notes: i.notes,
        estimatedPrice: i.estimatedPrice,
      })),
    );
    await recalculateEstimatedCost(list.id);
  }

  eventBus.emit("list:updated", { action: "created", list, homeId });
  return list;
}

export async function getLists(
  homeId: string,
): Promise<GroceryListWithItems[]> {
  // Lazy-check scheduled resets
  await checkAndResetScheduledLists(homeId);

  // Ensure default list exists
  await getOrCreateDefaultList(homeId);

  const lists = await db
    .select()
    .from(groceryListsTable)
    .where(eq(groceryListsTable.homeId, homeId))
    .orderBy(
      desc(groceryListsTable.isDefault),
      desc(groceryListsTable.isActive),
      desc(groceryListsTable.createdAt),
    );

  // Fetch items for all lists
  const result: GroceryListWithItems[] = [];
  for (const list of lists) {
    const rawItems = await db
      .select({
        listItem: listItemsTable,
        item: itemsTable,
      })
      .from(listItemsTable)
      .innerJoin(itemsTable, eq(listItemsTable.itemId, itemsTable.id))
      .where(eq(listItemsTable.listId, list.id))
      .orderBy(asc(listItemsTable.addedAt));

    let completedCount = 0;
    const items = rawItems.map((r) => {
      if (r.listItem.isCompleted) completedCount++;
      return { ...r.listItem, item: r.item };
    });

    result.push({
      ...list,
      items,
      completedItems: completedCount,
      totalItems: items.length,
      completionPercentage:
        items.length > 0
          ? Math.round((completedCount / items.length) * 100)
          : 0,
    });
  }

  return result;
}

export async function getList(
  homeId: string,
  listId: string,
): Promise<GroceryListWithItems | undefined> {
  // Lazy-check scheduled resets
  await checkAndResetScheduledLists(homeId);

  const [list] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    );

  if (!list) return undefined;

  // Fetch list items with joined pantry items
  const rawItems = await db
    .select({
      listItem: listItemsTable,
      item: itemsTable,
    })
    .from(listItemsTable)
    .innerJoin(itemsTable, eq(listItemsTable.itemId, itemsTable.id))
    .where(eq(listItemsTable.listId, listId))
    .orderBy(asc(listItemsTable.addedAt));

  let completedCount = 0;
  const items = rawItems.map((r) => {
    if (r.listItem.isCompleted) completedCount++;
    return { ...r.listItem, item: r.item };
  });
  const totalItems = items.length;
  const completedItems = completedCount;
  const completionPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    ...list,
    items,
    completedItems,
    totalItems,
    completionPercentage,
  };
}

export async function updateList(
  homeId: string,
  listId: string,
  data: UpdateListData,
): Promise<GroceryList | undefined> {
  // Recompute nextResetAt if schedule changed
  const updateData: Record<string, unknown> = { ...data };

  if (data.recurringSchedule !== undefined) {
    if (data.recurringSchedule) {
      updateData.nextResetAt = calculateNextResetAt(
        data.recurringSchedule,
        data.scheduleDayOfWeek,
        data.scheduleDayOfMonth,
      );
    } else {
      updateData.nextResetAt = null;
    }
  }

  const [list] = await db
    .update(groceryListsTable)
    .set(updateData)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    )
    .returning();

  if (list) {
    eventBus.emit("list:updated", { action: "updated", list, homeId });
  }
  return list;
}

export async function deleteList(
  homeId: string,
  listId: string,
): Promise<GroceryList | undefined> {
  // Prevent deletion of default list
  const [existing] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    );

  if (!existing) return undefined;
  if (existing.isDefault) {
    throw new Error("Cannot delete the default list");
  }

  const [list] = await db
    .delete(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    )
    .returning();

  if (list) {
    eventBus.emit("list:updated", { action: "deleted", list, homeId });
  }
  return list;
}

export async function completeList(
  homeId: string,
  listId: string,
): Promise<GroceryList | undefined> {
  const [list] = await db
    .update(groceryListsTable)
    .set({ isActive: false, completedAt: new Date() })
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    )
    .returning();

  if (list) {
    eventBus.emit("list:updated", { action: "completed", list, homeId });
  }
  return list;
}

// ============================================================================
// List item operations
// ============================================================================

export async function addListItem(
  homeId: string,
  listId: string,
  data: AddListItemData,
): Promise<ListItem | undefined> {
  // Validate list belongs to home
  const [list] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    );

  if (!list) return undefined;

  const [listItem] = await db
    .insert(listItemsTable)
    .values({
      listId,
      itemId: data.itemId,
      quantity: data.quantity ?? 1,
      notes: data.notes,
      estimatedPrice: data.estimatedPrice,
    })
    .returning();

  await recalculateEstimatedCost(listId);
  eventBus.emit("list:updated", {
    action: "item_added",
    list,
    listItem,
    homeId,
  });
  return listItem;
}

export async function removeListItem(
  homeId: string,
  listId: string,
  listItemId: string,
): Promise<ListItem | undefined> {
  // Validate list belongs to home
  const [list] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    );

  if (!list) return undefined;

  const [listItem] = await db
    .delete(listItemsTable)
    .where(
      and(eq(listItemsTable.id, listItemId), eq(listItemsTable.listId, listId)),
    )
    .returning();

  if (listItem) {
    await recalculateEstimatedCost(listId);
    eventBus.emit("list:updated", {
      action: "item_removed",
      list,
      listItem,
      homeId,
    });
  }
  return listItem;
}

export async function toggleListItem(
  homeId: string,
  listId: string,
  listItemId: string,
): Promise<ListItem | undefined> {
  // Validate list ownership and fetch item in parallel (independent queries)
  const [listResult, itemResult] = await Promise.all([
    db
      .select()
      .from(groceryListsTable)
      .where(
        and(
          eq(groceryListsTable.id, listId),
          eq(groceryListsTable.homeId, homeId),
        ),
      ),
    db
      .select()
      .from(listItemsTable)
      .where(
        and(
          eq(listItemsTable.id, listItemId),
          eq(listItemsTable.listId, listId),
        ),
      ),
  ]);

  const [list] = listResult;
  const [existing] = itemResult;
  if (!list || !existing) return undefined;

  const [listItem] = await db
    .update(listItemsTable)
    .set({
      isCompleted: !existing.isCompleted,
      completedAt: existing.isCompleted ? null : new Date(),
    })
    .where(
      and(eq(listItemsTable.id, listItemId), eq(listItemsTable.listId, listId)),
    )
    .returning();

  if (listItem) {
    eventBus.emit("list:updated", {
      action: "item_toggled",
      list,
      listItem,
      homeId,
    });
  }
  return listItem;
}

// ============================================================================
// Stats
// ============================================================================

export async function getListStats(
  homeId: string,
  listId: string,
): Promise<ListStats | undefined> {
  // Validate list belongs to home
  const [list] = await db
    .select()
    .from(groceryListsTable)
    .where(
      and(
        eq(groceryListsTable.id, listId),
        eq(groceryListsTable.homeId, homeId),
      ),
    );

  if (!list) return undefined;

  const items = await db
    .select()
    .from(listItemsTable)
    .where(eq(listItemsTable.listId, listId));

  const totalItems = items.length;
  let completedItems = 0;
  let estimatedTotal = 0;
  for (const i of items) {
    if (i.isCompleted) completedItems++;
    estimatedTotal += (i.estimatedPrice || 0) * i.quantity;
  }
  const completionPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const estimatedPerItem = totalItems > 0 ? estimatedTotal / totalItems : 0;

  return {
    totalItems,
    completedItems,
    completionPercentage,
    estimatedTotal,
    estimatedPerItem,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

async function recalculateEstimatedCost(listId: string): Promise<void> {
  const items = await db
    .select()
    .from(listItemsTable)
    .where(eq(listItemsTable.listId, listId));

  const total = items.reduce(
    (sum, i) => sum + (i.estimatedPrice || 0) * i.quantity,
    0,
  );

  await db
    .update(groceryListsTable)
    .set({ estimatedCost: total })
    .where(eq(groceryListsTable.id, listId));
}
