import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

export function createSetRecurringTool(homeId: string) {
  return tool({
    description:
      "Set an item as recurring so the user gets reminded to restock. Use when they mention buying something regularly.",
    parameters: z.object({
      name: z.string().describe("Name of the item to make recurring"),
      interval: z
        .enum(["daily", "weekly", "biweekly", "monthly"])
        .describe("How often the item should be restocked"),
    }),
    execute: async ({ name, interval }) => {
      const item = await itemsService.findItemByName(homeId, name);

      if (!item) {
        return {
          success: false,
          message: `Couldn't find "${name}" in the pantry. Add it first, then I can set it as recurring.`,
        };
      }

      await itemsService.updateItem(homeId, item.id, {
        isRecurring: true,
        recurringInterval: interval,
      });

      return {
        success: true,
        item: { name: item.name, interval },
        message: `Set ${item.name} as recurring ${interval}. I'll keep track of when you need to restock.`,
      };
    },
  });
}
