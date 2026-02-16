import { tool } from "ai";
import { z } from "zod";
import * as groceryListsService from "../../services/grocery-lists";
import type { GroceryListWithItems } from "@pantry-pixie/core";

export function createAddToListTool(
  homeId: string,
  scopedListId?: string | null,
) {
  return tool({
    description:
      "Add items to a grocery/shopping list. Supports structured items with quantity and unit. Use for: 'add X to my list', 'put X on my shopping list', 'add all ingredients for [dish] to my list'. For recipe requests, include all ingredients with appropriate quantities and units.",
    parameters: z.object({
      items: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Item name (e.g., 'chicken breast', 'jasmine rice')"),
            quantity: z
              .number()
              .optional()
              .describe("How many/much to buy (e.g., 2, 500)"),
            unit: z
              .string()
              .optional()
              .describe("Unit (e.g., 'g', 'kg', 'pieces', 'bunch', 'can')"),
            notes: z
              .string()
              .optional()
              .describe("Extra context (e.g., 'organic', 'for green curry')"),
          }),
        )
        .describe(
          "Items to add to the list with optional quantity, unit, and notes",
        ),
      listName: z
        .string()
        .optional()
        .describe(
          "Name of the list (optional, defaults to scoped list or 'Quick Items')",
        ),
    }),
    execute: async ({ items, listName }) => {
      // 1. Get or create list (we only need the id, so we don't need the full type)
      let listId: string;
      if (scopedListId) {
        // Use the scoped list ID (from chat context) - verify it exists
        const scopedList = await groceryListsService.getList(
          homeId,
          scopedListId,
        );
        if (scopedList) {
          listId = scopedList.id;
        } else {
          // Fallback if scoped list not found
          const defaultList =
            await groceryListsService.getOrCreateDefaultList(homeId);
          listId = defaultList.id;
        }
      } else if (listName) {
        // Try to find list by name
        const allLists = await groceryListsService.getLists(homeId);
        const found = allLists.find(
          (l) => l.name.toLowerCase() === listName.toLowerCase(),
        );
        if (found) {
          listId = found.id;
        } else {
          // Create new list with the specified name
          const newList = await groceryListsService.createList(homeId, {
            name: listName,
          });
          listId = newList.id;
        }
      } else {
        // Use default list
        const defaultList =
          await groceryListsService.getOrCreateDefaultList(homeId);
        listId = defaultList.id;
      }

      // 2. Fetch current list to check for duplicates
      const currentList = await groceryListsService.getList(homeId, listId);
      const existingItemNames = new Set(
        currentList?.items.map((li) => li.item.name.toLowerCase()) ?? [],
      );

      // 3. Add each item to the list (skip duplicates)
      let addedCount = 0;
      const skippedItems: string[] = [];

      for (const itemData of items) {
        // Check for duplicates
        if (existingItemNames.has(itemData.name.toLowerCase())) {
          skippedItems.push(itemData.name);
          continue;
        }

        // Find or create the pantry item
        const item = await groceryListsService.findOrCreateItem(
          homeId,
          itemData.name,
        );
        // Add to the list with quantity and notes
        await groceryListsService.addListItem(homeId, listId, {
          itemId: item.id,
          quantity: itemData.quantity ?? 1,
          notes: itemData.notes,
        });

        existingItemNames.add(itemData.name.toLowerCase());
        addedCount++;
      }

      // 4. Fetch updated list with all items
      const updatedList = await groceryListsService.getList(homeId, listId);

      if (!updatedList) {
        return {
          success: false,
          message: "Failed to retrieve updated list",
        };
      }

      // 5. Build response message
      let message = `Added ${addedCount} item${addedCount !== 1 ? "s" : ""} to ${updatedList.name}`;
      if (skippedItems.length > 0) {
        message += ` (skipped ${skippedItems.join(", ")} — already on list)`;
      }

      // 6. Return structured data for UI rendering
      return {
        success: true,
        message,
        listData: {
          id: updatedList.id,
          name: updatedList.name,
          items: updatedList.items.map((li) => ({
            id: li.id,
            itemId: li.item.id,
            name: li.item.name,
            quantity: li.quantity,
            isCompleted: li.isCompleted,
          })),
          completionPercentage: updatedList.completionPercentage,
          completedItems: updatedList.completedItems,
          totalItems: updatedList.totalItems,
        },
      };
    },
  });
}
