import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

export function createListItemsTool(homeId: string) {
  const schema = z.object({
    category: z
      .string()
      .optional()
      .describe(
        "Filter by category (produce, dairy, meat, pantry, frozen, beverages, condiments, other)",
      ),
    search: z.string().optional().describe("Search for items by name"),
  });

  return tool({
    description:
      "List items in the user's pantry. Use when the user asks what they have, checks inventory, or asks about specific items.",
    inputSchema: schema,
    execute: async ({ category, search }: z.infer<typeof schema>) => {
      const items = await itemsService.listItems(homeId, { category, search });

      const now = new Date();
      const formatted = items.map((item) => {
        const daysUntilExpiry = item.expiresAt
          ? Math.ceil(
              (item.expiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          location: item.location,
          isChecked: item.isChecked,
          daysUntilExpiry,
          isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
          isExpiringSoon:
            daysUntilExpiry !== null &&
            daysUntilExpiry >= 0 &&
            daysUntilExpiry <= 3,
        };
      });

      return {
        success: true,
        items: formatted,
        total: formatted.length,
        message:
          formatted.length > 0
            ? `Found ${formatted.length} item${formatted.length !== 1 ? "s" : ""} in the pantry.`
            : "The pantry is empty.",
      };
    },
  });
}
