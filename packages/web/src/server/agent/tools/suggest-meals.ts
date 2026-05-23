import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

/**
 * Meal suggestion tool. Grounds the model in the household's ACTUAL inventory,
 * prioritising items that are expiring soon and surfacing every partner's
 * dietary needs. It does not invent recipes — it returns structured pantry
 * context so the model's suggestions use what the couple really has on hand.
 */
export function createSuggestMealsTool(homeId: string, dietary?: string[]) {
  const schema = z.object({
    mealType: z
      .enum(["any", "breakfast", "lunch", "dinner", "snack"])
      .default("any")
      .describe("Which meal to suggest for"),
    useExpiringFirst: z
      .boolean()
      .default(true)
      .describe("Prioritise ingredients that are expiring soon to reduce waste"),
  });

  return tool({
    description:
      "Suggest meals the household can make from what's currently in their pantry. Use when the user asks what to cook, wants meal or recipe ideas, or asks how to use up ingredients. Prioritises items expiring soon and respects every partner's dietary needs.",
    inputSchema: schema,
    execute: async ({ mealType, useExpiringFirst }: z.infer<typeof schema>) => {
      const items = await itemsService.listItems(homeId);
      const now = new Date();

      const inventory = items.map((item) => {
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
          category: item.category,
          daysUntilExpiry,
          isExpiringSoon:
            daysUntilExpiry !== null &&
            daysUntilExpiry >= 0 &&
            daysUntilExpiry <= 3,
        };
      });

      const expiringSoon = inventory.filter((i) => i.isExpiringSoon);

      return {
        success: true,
        mealType,
        useExpiringFirst,
        dietaryRestrictions: dietary ?? [],
        inventory,
        expiringSoon,
        message:
          inventory.length > 0
            ? `Here's what the household has on hand${
                expiringSoon.length
                  ? `, including ${expiringSoon.length} item(s) expiring soon`
                  : ""
              }. Suggest meals that use these${
                dietary && dietary.length
                  ? `, respecting everyone's dietary needs: ${dietary.join(", ")}`
                  : ""
              }.`
            : "The pantry is empty, so suggest a few easy staple meals and what to buy for them.",
      };
    },
  });
}
