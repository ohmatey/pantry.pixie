import { tool } from "ai";
import { z } from "zod";
import * as budgetService from "../../services/budget";
import { formatMoney } from "../../services/budget";

export function createQueryBudgetTool(homeId: string) {
  const schema = z.object({
    period: z
      .enum(["week", "month"])
      .default("month")
      .describe(
        "Time period to query: 'week' (last 7 days) or 'month' (last 30 days)",
      ),
  });

  return tool({
    description:
      "Query spending and budget information. Use when the user asks about spending, costs, how much they spent, or budget questions. Report figures as neutral facts — never judge or scold.",
    inputSchema: schema,
    execute: async ({ period }: z.infer<typeof schema>) => {
      const summary = await budgetService.getBudgetSummary(homeId);
      const data = period === "week" ? summary.week : summary.month;

      const topCategories = data.byCategory
        .slice(0, 3)
        .map((c) => `${c.category}: ${formatMoney(c.total)}`)
        .join(", ");

      let trendNote = "";
      if (data.comparison) {
        const pct = Math.round(Math.abs(data.comparison.changePercent));
        if (data.comparison.trend === "up") {
          trendNote = ` That's up ${pct}% vs the previous ${period}.`;
        } else if (data.comparison.trend === "down") {
          trendNote = ` That's down ${pct}% vs the previous ${period}.`;
        }
      }

      let budgetNote = "";
      if (data.budget) {
        budgetNote =
          data.budget.status === "over"
            ? ` You're a little over the monthly budget — happy to help plan the rest of the month, no worries.`
            : ` That's about ${Math.round(data.budget.percentUsed)}% of the monthly budget.`;
      }

      return {
        success: true,
        data: {
          period,
          total: data.total,
          itemCount: data.itemCount,
          averagePerItem: data.averagePerItem,
          topCategories: data.byCategory.slice(0, 5),
          comparison: data.comparison,
          budget: data.budget,
          insights: data.insights,
        },
        message:
          data.total > 0
            ? `In the last ${period}, the household spent ${formatMoney(data.total)} across ${data.itemCount} item${data.itemCount !== 1 ? "s" : ""}.${trendNote}${budgetNote} Top categories: ${topCategories || "none yet"}.`
            : `No spending recorded for this ${period} yet — add prices when you log items and I'll track it for you, no judgment.`,
      };
    },
  });
}
