import { tool } from "ai";
import { z } from "zod";
import * as itemsService from "../../services/items";

export function createRemoveItemTool(homeId: string) {
  const schema = z.object({
    name: z.string().describe("Name of the item to remove"),
  });

  return tool({
    description:
      "Remove an item from the pantry. Use when the user says they ran out of, used up, finished, or want to delete something.",
    inputSchema: schema,
    execute: async ({ name }: z.infer<typeof schema>) => {
      const item = await itemsService.findItemByName(homeId, name);

      if (!item) {
        return {
          success: false,
          message: `Couldn't find "${name}" in the pantry.`,
        };
      }

      await itemsService.removeItem(homeId, item.id);

      return {
        success: true,
        removed: { id: item.id, name: item.name },
        message: `Removed ${item.name} from the pantry.`,
      };
    },
  });
}
