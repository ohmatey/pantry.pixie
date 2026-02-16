import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

export function createAddItemTool(homeId: string) {
  const schema = z.object({
    name: z
      .string()
      .describe("Name of the item (e.g., 'eggs', 'milk', 'apples')"),
    quantity: z.number().default(1).describe("How many/much of the item"),
    unit: z
      .string()
      .optional()
      .describe("Unit of measurement (e.g., 'pieces', 'lbs', 'gallons')"),
    category: z
      .string()
      .optional()
      .describe(
        "Category: produce, dairy, meat, pantry, frozen, beverages, condiments, other",
      ),
    location: z
      .string()
      .optional()
      .describe("Storage location (e.g., 'fridge', 'pantry', 'freezer')"),
    expiresInDays: z
      .number()
      .optional()
      .describe("How many days until the item expires"),
    price: z
      .string()
      .optional()
      .describe(
        "Price in Thai Baht (฿). Extract from phrases like 'for 50 baht', '฿60', or 'costs 75'",
      ),
  });

  return tool({
    description:
      "Add a new item to the user's pantry inventory. Use this when the user says they bought, got, or added something, or when they say they need something. Extract price from messages like 'eggs for 50 baht' or 'milk ฿60'.",
    inputSchema: schema,
    execute: async ({ name, quantity, unit, category, location, expiresInDays, price }: z.infer<typeof schema>) => {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const item = await itemsService.addItem(homeId, {
        name,
        quantity,
        unit: unit || "piece",
        category: category || "other",
        location,
        expiresAt,
        price: price ? parseFloat(price) : undefined,
      });

      const priceMessage = price ? ` (฿${price})` : "";
      return {
        success: true,
        item: {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price,
        },
        message: `Added ${quantity} ${unit || "piece"}${quantity > 1 ? "s" : ""} of ${name}${priceMessage} to the pantry.`,
      };
    },
  });
}
