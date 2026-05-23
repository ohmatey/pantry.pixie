import { tool } from "ai";
import { z } from "zod";
import { predictAllDepletions } from "../../services/predictions";

/**
 * Lets Pixie answer "what are we about to run out of?" using the household's
 * learned purchase cadence (derived from item_usage_history). Returns items
 * predicted to run out within a window, with confidence + reasoning so the
 * model can hedge appropriately on low-confidence guesses.
 */
export function createCheckPredictionsTool(homeId: string) {
  const schema = z.object({
    withinDays: z
      .number()
      .default(14)
      .describe("Only include items predicted to run out within this many days"),
  });

  return tool({
    description:
      "Check which pantry items the household is likely to run out of soon, based on how often they're restocked. Use when the user asks what they're about to run out of, what to restock, or to proactively suggest items for the list.",
    inputSchema: schema,
    execute: async ({ withinDays }: z.infer<typeof schema>) => {
      const all = await predictAllDepletions(homeId);
      const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
      const predictions = all
        .filter((p) => p.predictedDepletionDate.getTime() <= cutoff)
        .map((p) => ({
          name: p.itemName,
          predictedDepletionDate: p.predictedDepletionDate
            .toISOString()
            .slice(0, 10),
          confidence: p.confidence,
          reasoning: p.reasoning,
        }));

      return {
        success: true,
        withinDays,
        predictions,
        message: predictions.length
          ? `${predictions.length} item(s) likely to run out within ${withinDays} days. Lower-confidence ones are rough guesses — mention that.`
          : `Nothing looks likely to run out in the next ${withinDays} days based on current patterns.`,
      };
    },
  });
}
