/**
 * Budget service - Calculate spending and provide insights
 */

import { db, itemsTable, eq, and } from "@pantry-pixie/core";
import { gte } from "drizzle-orm";

export type TimePeriod = "week" | "month" | "all-time";

export interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  averagePerItem: number;
}

export interface BudgetSummary {
  total: number;
  period: TimePeriod;
  byCategory: CategorySpending[];
  itemCount: number;
  averagePerItem: number;
  startDate?: Date;
  endDate: Date;
}

/**
 * Get the start date for a given time period
 */
function getPeriodStartDate(period: TimePeriod): Date | null {
  const now = new Date();

  switch (period) {
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo;

    case "month":
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo;

    case "all-time":
      return null; // No start date filter
  }
}

/**
 * Calculate spending for a home within a given period
 */
export async function calculateSpending(
  homeId: string,
  period: TimePeriod = "month",
): Promise<BudgetSummary> {
  const startDate = getPeriodStartDate(period);
  const endDate = new Date();

  // Build query conditions
  const conditions = [eq(itemsTable.homeId, homeId)];

  if (startDate) {
    conditions.push(gte(itemsTable.dateAdded, startDate));
  }

  // Fetch items with estimated costs within the period
  const itemsWithCosts = await db
    .select({
      id: itemsTable.id,
      name: itemsTable.name,
      category: itemsTable.category,
      price: itemsTable.price,
      dateAdded: itemsTable.dateAdded,
    })
    .from(itemsTable)
    .where(and(...conditions));

  // Calculate totals
  let total = 0;
  const categoryMap = new Map<string, CategorySpending>();

  for (const item of itemsWithCosts) {
    const cost = item.price ? parseFloat(item.price) : 0;

    if (cost > 0) {
      total += cost;

      // Update category spending
      const category = item.category || "other";
      const existing = categoryMap.get(category);

      if (existing) {
        existing.total += cost;
        existing.itemCount += 1;
      } else {
        categoryMap.set(category, {
          category,
          total: cost,
          itemCount: 1,
          averagePerItem: cost,
        });
      }
    }
  }

  // Calculate averages for each category
  const byCategory: CategorySpending[] = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      averagePerItem: cat.total / cat.itemCount,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total spending (highest first)

  const itemsWithCostCount = itemsWithCosts.filter(
    (item) => item.price && parseFloat(item.price) > 0,
  ).length;

  return {
    total,
    period,
    byCategory,
    itemCount: itemsWithCostCount,
    averagePerItem: itemsWithCostCount > 0 ? total / itemsWithCostCount : 0,
    startDate: startDate || undefined,
    endDate,
  };
}

/**
 * Get spending insights and recommendations
 */
export async function getSpendingInsights(homeId: string): Promise<{
  topCategory: string | null;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
}> {
  // Get current month and previous month spending
  const currentMonth = await calculateSpending(homeId, "month");

  // Calculate previous month (simplified - get all-time and subtract current month)
  const allTime = await calculateSpending(homeId, "all-time");
  const previousMonthTotal = allTime.total - currentMonth.total;

  // Determine trend
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (currentMonth.total > previousMonthTotal * 1.1) {
    trend = "increasing";
  } else if (currentMonth.total < previousMonthTotal * 0.9) {
    trend = "decreasing";
  }

  return {
    topCategory: currentMonth.byCategory[0]?.category || null,
    weeklyAverage: currentMonth.total / 4, // Rough estimate
    monthlyAverage: currentMonth.total,
    trend,
  };
}

/**
 * Get budget summary for display in UI
 */
export async function getBudgetSummary(homeId: string) {
  const [week, month] = await Promise.all([
    calculateSpending(homeId, "week"),
    calculateSpending(homeId, "month"),
  ]);

  return {
    week,
    month,
    insights: await getSpendingInsights(homeId),
  };
}
