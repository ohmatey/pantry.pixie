import { tool } from "ai";
import { z } from "zod";
import * as groceryListsService from "../../services/grocery-lists";
import type { GroceryListsOverviewUI } from "../../ws";

export function createListGroceryListsTool(homeId: string) {
  return tool({
    description:
      "Show all grocery/shopping lists for the home. Use when user asks " +
      "'show my lists', 'what lists do I have', 'show all shopping lists', etc.",
    parameters: z.object({
      includeCompleted: z.boolean().optional().default(false)
        .describe("Include completed lists in the results"),
    }),
    execute: async ({ includeCompleted }) => {
      const allLists = await groceryListsService.getLists(homeId);

      // Filter based on status
      const lists = includeCompleted
        ? allLists
        : allLists.filter(l => l.isActive);

      // Map to UI format
      const uiData: GroceryListsOverviewUI = {
        lists: lists.map(list => ({
          id: list.id,
          name: list.name,
          description: list.description || undefined,
          status: list.isActive ? "active" : "completed",
          totalItems: list.totalItems,
          completedItems: list.completedItems,
          completionPercentage: list.completionPercentage,
          estimatedCost: list.estimatedCost ? Number(list.estimatedCost) : undefined,
          createdAt: list.createdAt.toISOString(),
        })),
      };

      return {
        success: true,
        message: `Found ${lists.length} list${lists.length !== 1 ? 's' : ''}`,
        uiData: {
          type: "grocery-lists-overview" as const,
          data: uiData,
        },
      };
    },
  });
}
