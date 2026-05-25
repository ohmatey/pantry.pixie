import { tool } from "ai";
import { z } from "zod";
import type { ParsedReceipt } from "../../services/receipts";

/**
 * Renders an inline, editable receipt-review card in chat so the user can confirm
 * scanned items into the pantry. Does NOT run vision or touch the DB — it shapes
 * the already-parsed receipt (bound at construction) into UI data, so the card
 * always reflects the trusted parse rather than model-echoed arguments.
 */
export function createPresentReceiptReviewTool(parsed: ParsedReceipt) {
  const schema = z.object({
    acknowledged: z
      .boolean()
      .optional()
      .describe("Set true to display the receipt review card to the user."),
  });

  return tool({
    description:
      "Show an editable receipt-review card so the user can confirm the scanned " +
      "items into their pantry. Call this right after a receipt was scanned.",
    inputSchema: schema,
    execute: async () => {
      return {
        success: true,
        message:
          "Here's what I read — tweak anything that looks off, then add it to your pantry.",
        uiData: {
          type: "receipt-review" as const,
          data: parsed,
        },
      };
    },
  });
}
