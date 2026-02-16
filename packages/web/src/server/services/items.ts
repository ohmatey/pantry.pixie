/**
 * Items service — single source of truth for item CRUD operations.
 * Used by both agent tools and API handlers.
 */

import {
  db,
  eq,
  and,
  ilike,
  asc,
  itemsTable,
  type Item,
} from "@pantry-pixie/core";
import { eventBus } from "./events";

export interface AddItemData {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  location?: string;
  expiresAt?: Date;
  notes?: string;
  price?: number;
}

export interface UpdateItemData {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  location?: string;
  expiresAt?: Date;
  notes?: string;
  price?: number;
  isRecurring?: boolean;
  recurringInterval?: string;
  isChecked?: boolean;
}

export interface ItemFilters {
  category?: string;
  search?: string;
  isChecked?: boolean;
}

export async function addItem(
  homeId: string,
  data: AddItemData,
): Promise<Item> {
  const [item] = await db
    .insert(itemsTable)
    .values({
      homeId,
      name: data.name,
      quantity: data.quantity ?? 1,
      unit: data.unit || "piece",
      category: data.category || "other",
      location: data.location || undefined,
      expiresAt: data.expiresAt,
      notes: data.notes,
      price: data.price,
    })
    .returning();

  eventBus.emit("inventory:updated", { action: "added", item, homeId });
  return item;
}

export async function listItems(
  homeId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  let items = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.homeId, homeId))
    .orderBy(asc(itemsTable.category), asc(itemsTable.dateAdded));

  if (filters?.category) {
    items = items.filter((i) => i.category === filters.category);
  }

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(term));
  }

  if (filters?.isChecked !== undefined) {
    items = items.filter((i) => i.isChecked === filters.isChecked);
  }

  return items;
}

export async function getItem(
  homeId: string,
  itemId: string,
): Promise<Item | undefined> {
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.id, itemId), eq(itemsTable.homeId, homeId)));

  return item;
}

export async function updateItem(
  homeId: string,
  itemId: string,
  data: UpdateItemData,
): Promise<Item | undefined> {
  const [item] = await db
    .update(itemsTable)
    .set({ ...data, lastUpdated: new Date() })
    .where(and(eq(itemsTable.id, itemId), eq(itemsTable.homeId, homeId)))
    .returning();

  if (item) {
    eventBus.emit("inventory:updated", { action: "updated", item, homeId });
  }
  return item;
}

export async function removeItem(
  homeId: string,
  itemId: string,
): Promise<Item | undefined> {
  const [item] = await db
    .delete(itemsTable)
    .where(and(eq(itemsTable.id, itemId), eq(itemsTable.homeId, homeId)))
    .returning();

  if (item) {
    eventBus.emit("inventory:updated", { action: "removed", item, homeId });
  }
  return item;
}

export async function findItemByName(
  homeId: string,
  name: string,
): Promise<Item | undefined> {
  const items = await db
    .select()
    .from(itemsTable)
    .where(
      and(eq(itemsTable.homeId, homeId), ilike(itemsTable.name, `%${name}%`)),
    );

  return items[0];
}

export async function toggleItemCheck(
  homeId: string,
  itemId: string,
): Promise<Item | undefined> {
  const existing = await getItem(homeId, itemId);
  if (!existing) return undefined;

  const [item] = await db
    .update(itemsTable)
    .set({ isChecked: !existing.isChecked, lastUpdated: new Date() })
    .where(and(eq(itemsTable.id, itemId), eq(itemsTable.homeId, homeId)))
    .returning();

  if (item) {
    eventBus.emit("inventory:updated", { action: "toggled", item, homeId });
  }
  return item;
}

export async function getStats(homeId: string) {
  const items = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.homeId, homeId));

  const total = items.length;
  const checked = items.filter((i) => i.isChecked).length;
  const unchecked = total - checked;

  const byCategory: Record<string, { total: number; checked: number }> = {};
  for (const item of items) {
    const cat = item.category || "other";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, checked: 0 };
    byCategory[cat].total++;
    if (item.isChecked) byCategory[cat].checked++;
  }

  return { total, checked, unchecked, byCategory };
}
