import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

export function createCheckItemTool(homeId: string) {
  const schema = z.object({
    name: z.string().describe("Name of the item to check"),
  });

  return tool({
    description:
      "Check if a specific item exists in the pantry and its status. Use when the user asks 'do I have...?' or 'how many...?' questions.",
    inputSchema: schema,
    execute: async ({ name }: z.infer<typeof schema>) => {
      const items = await itemsService.listItems(homeId, { search: name });

      if (items.length === 0) {
        return {
          success: true,
          found: false,
          message: `No ${name} found in the pantry.`,
        };
      }

      const now = new Date();
      const results = items.map((item) => {
        const daysUntilExpiry = item.expiresAt
          ? Math.ceil(
              (item.expiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          isChecked: item.isChecked,
          daysUntilExpiry,
          addedDaysAgo: Math.floor(
            (now.getTime() - item.dateAdded.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      });

      return {
        success: true,
        found: true,
        items: results,
        message: `Found ${results.length} matching item${results.length !== 1 ? "s" : ""}.`,
      };
    },
  });
}
