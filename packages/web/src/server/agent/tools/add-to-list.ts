import { tool } from "ai";
import { z } from "zod";
import * as groceryListsService from "../../services/grocery-lists";
import type { GroceryListWithItems } from "@pantry-pixie/core";

export function createAddToListTool(homeId: string) {
  return tool({
    description: "Add items to a grocery/shopping list and return the updated list for visual display. Use when user says 'add X to my list', 'put X on my shopping list', etc.",
    parameters: z.object({
      items: z.array(z.string()).describe("Names of items to add (e.g., ['milk', 'eggs', 'bread'])"),
      listName: z.string().optional().describe("Name of the list (optional, defaults to 'Quick Items')"),
    }),
    execute: async ({ items, listName }) => {
      // 1. Get or create list
      let list: import("@pantry-pixie/core").GroceryList;
      if (listName) {
        // Try to find list by name
        const allLists = await groceryListsService.getLists(homeId);
        const found = allLists.find(
          (l) => l.name.toLowerCase() === listName.toLowerCase()
        );
        if (found) {
          list = found;
        } else {
          // Create new list with the specified name
          list = await groceryListsService.createList(homeId, { name: listName });
        }
      } else {
        // Use default list
        list = await groceryListsService.getOrCreateDefaultList(homeId);
      }

      // 2. Add each item to the list
      for (const itemName of items) {
        // Find or create the pantry item
        const item = await groceryListsService.findOrCreateItem(homeId, itemName);
        // Add to the list
        await groceryListsService.addListItem(homeId, list.id, { itemId: item.id });
      }

      // 3. Fetch updated list with all items
      const updatedList = await groceryListsService.getList(homeId, list.id);

      if (!updatedList) {
        return {
          success: false,
          message: "Failed to retrieve updated list",
        };
      }

      // 4. Return structured data for UI rendering
      return {
        success: true,
        message: `Added ${items.length} item${items.length > 1 ? "s" : ""} to ${updatedList.name}`,
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
