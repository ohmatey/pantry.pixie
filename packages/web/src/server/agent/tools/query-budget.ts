import { tool } from "ai";
import { z } from "zod";
import * as budgetService from "../../services/budget";

export function createQueryBudgetTool(homeId: string) {
  const schema = z.object({
    period: z
      .enum(["week", "month", "all-time"])
      .default("month")
      .describe("Time period to query: 'week' (last 7 days), 'month' (last 30 days), 'all-time'"),
  });

  return tool({
    description:
      "Query spending and budget information. Use when the user asks about spending, costs, how much they spent, or budget questions.",
    inputSchema: schema,
    execute: async ({ period }: z.infer<typeof schema>) => {
      const summary = await budgetService.getBudgetSummary(homeId);
      const data = period === "week" ? summary.week : summary.month;

      const topCategories = data.byCategory
        .slice(0, 3)
        .map((c) => `${c.category}: ฿${c.total.toFixed(2)}`)
        .join(", ");

      return {
        success: true,
        data: {
          period,
          total: data.total,
          itemCount: data.itemCount,
          averagePerItem: data.averagePerItem,
          topCategories: data.byCategory.slice(0, 5),
          insights: summary.insights,
        },
        message: data.total > 0
          ? `In the last ${period === "week" ? "week" : "month"}, you spent ฿${data.total.toFixed(2)} across ${data.itemCount} items. Top categories: ${topCategories || "none yet"}.`
          : `No spending recorded for this ${period}.`,
      };
    },
  });
}
