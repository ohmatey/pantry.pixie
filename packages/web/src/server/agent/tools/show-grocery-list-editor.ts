import { tool } from "ai";
import { z } from "zod";
import * as groceryListsService from "../../services/grocery-lists";
import type { ListEditorUI } from "../../ws";

export function createShowGroceryListEditorTool(
  homeId: string,
  scopedListId?: string | null,
) {
  return tool({
    description:
      "Show a specific grocery list with full editing capabilities (add, remove, edit, toggle items). " +
      "Use when user wants to manage or view details of a specific list.",
    parameters: z.object({
      listId: z.string().optional().describe("The ID of the list to show"),
      listName: z
        .string()
        .optional()
        .describe("The name of the list to show (alternative to listId)"),
    }),
    execute: async (params: { listId?: string; listName?: string }) => {
      const { listId, listName } = params;
      let list;

      // Find list by ID or name (priority: explicit ID > explicit name > scoped list > default)
      if (listId) {
        list = await groceryListsService.getList(homeId, listId);
      } else if (listName) {
        const allLists = await groceryListsService.getLists(homeId);
        const found = allLists.find(
          (l) => l.name.toLowerCase() === listName.toLowerCase(),
        );
        if (!found) {
          return {
            success: false,
            message: `Couldn't find a list named "${listName}"`,
          };
        }
        list = await groceryListsService.getList(homeId, found.id);
      } else if (scopedListId) {
        // Use scoped list from chat context
        list = await groceryListsService.getList(homeId, scopedListId);
      } else {
        // Default to default list
        list = await groceryListsService.getOrCreateDefaultList(homeId);
        // Fetch full details with items
        list = await groceryListsService.getList(homeId, list.id);
      }

      if (!list) {
        return {
          success: false,
          message: "List not found",
        };
      }

      // Map to UI format
      const uiData: ListEditorUI = {
        list: {
          id: list.id,
          name: list.name,
          description: list.description || undefined,
          status: list.isActive ? "active" : "completed",
          totalBudget: list.totalBudget ? Number(list.totalBudget) : undefined,
          estimatedCost: list.estimatedCost
            ? Number(list.estimatedCost)
            : undefined,
          items: list.items.map((li) => ({
            id: li.id,
            itemId: li.itemId,
            name: li.item.name,
            quantity: li.quantity,
            unit: li.item.unit || undefined,
            notes: li.notes || undefined,
            estimatedPrice: li.estimatedPrice
              ? Number(li.estimatedPrice)
              : undefined,
            isCompleted: li.isCompleted,
          })),
          completionPercentage: list.completionPercentage,
          completedItems: list.completedItems,
          totalItems: list.totalItems,
        },
      };

      return {
        success: true,
        message: `Here's ${list.name} with ${list.totalItems} item${list.totalItems !== 1 ? "s" : ""}`,
        uiData: {
          type: "list-editor" as const,
          data: uiData,
        },
      };
    },
  });
}
