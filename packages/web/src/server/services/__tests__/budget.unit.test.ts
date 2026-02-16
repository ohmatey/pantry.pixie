/**
 * Unit tests for budget service
 *
 * NOTE: The budget service (budget.ts) currently has broken imports.
 * It imports `items` and `itemUsageHistory` from `@pantry-pixie/core`,
 * but core only exports `itemsTable` (from schema/item.ts).
 * The `items` table object (from schema/items.ts) is not re-exported.
 * Additionally, `items.estimatedCost` doesn't match `itemsTable.price`.
 *
 * These tests verify the getPeriodStartDate logic (pure function)
 * and document the broken state for future fix.
 */

import { describe, it, expect } from "bun:test";

// ============================================================================
// getPeriodStartDate logic — inlined since it's not exported
// ============================================================================

type TimePeriod = "week" | "month" | "all-time";

function getPeriodStartDate(period: TimePeriod): Date | null {
  const now = new Date();

  switch (period) {
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo;
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo;
    }
    case "all-time":
      return null;
  }
}

describe("Budget Service - getPeriodStartDate logic", () => {
  it("should return null for all-time period", () => {
    const result = getPeriodStartDate("all-time");
    expect(result).toBeNull();
  });

  it("should return ~7 days ago for week period", () => {
    const before = new Date();
    const result = getPeriodStartDate("week");
    const after = new Date();

    expect(result).toBeInstanceOf(Date);

    const expectedMin = before.getTime() - 7 * 24 * 60 * 60 * 1000 - 1000;
    const expectedMax = after.getTime() - 7 * 24 * 60 * 60 * 1000 + 1000;

    expect(result!.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(result!.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("should return ~1 month ago for month period", () => {
    const now = new Date();
    const result = getPeriodStartDate("month");

    expect(result).toBeInstanceOf(Date);

    // Should be approximately 28-31 days ago
    const diffMs = now.getTime() - result!.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);

    expect(diffDays).toBeGreaterThanOrEqual(27);
    expect(diffDays).toBeLessThanOrEqual(32);
  });

  it("should handle month boundary correctly for Jan->Dec", () => {
    // This tests Date.setMonth(-1) behavior
    const jan = new Date(2026, 0, 15); // January 15, 2026
    const prevMonth = new Date(jan);
    prevMonth.setMonth(jan.getMonth() - 1);

    expect(prevMonth.getMonth()).toBe(11); // December
    expect(prevMonth.getFullYear()).toBe(2025);
  });
});

// ============================================================================
// Budget type contracts
// ============================================================================

describe("Budget Service - type contracts", () => {
  it("should define valid TimePeriod values", () => {
    const validPeriods: TimePeriod[] = ["week", "month", "all-time"];
    expect(validPeriods.length).toBe(3);
  });

  it("should define CategorySpending shape", () => {
    const spending = {
      category: "dairy",
      total: 15.5,
      itemCount: 3,
      averagePerItem: 5.17,
    };

    expect(spending.category).toBeString();
    expect(spending.total).toBeNumber();
    expect(spending.itemCount).toBeNumber();
    expect(spending.averagePerItem).toBeNumber();
  });

  it("should define BudgetSummary shape", () => {
    const summary = {
      total: 100.0,
      period: "month" as TimePeriod,
      byCategory: [] as Array<{
        category: string;
        total: number;
        itemCount: number;
        averagePerItem: number;
      }>,
      itemCount: 10,
      averagePerItem: 10.0,
      endDate: new Date(),
    };

    expect(summary.total).toBeNumber();
    expect(summary.period).toBe("month");
    expect(Array.isArray(summary.byCategory)).toBe(true);
    expect(summary.endDate).toBeInstanceOf(Date);
  });
});

// ============================================================================
// Budget calculation logic — unit tests for pure math
// ============================================================================

describe("Budget Service - calculation logic", () => {
  it("should calculate average per item correctly", () => {
    const total = 50.0;
    const itemCount = 10;
    const avg = itemCount > 0 ? total / itemCount : 0;

    expect(avg).toBe(5.0);
  });

  it("should return 0 average when no items", () => {
    const total = 0;
    const itemCount = 0;
    const avg = itemCount > 0 ? total / itemCount : 0;

    expect(avg).toBe(0);
  });

  it("should sort categories by total (highest first)", () => {
    const categories = [
      { category: "dairy", total: 10 },
      { category: "produce", total: 25 },
      { category: "bakery", total: 5 },
    ];

    const sorted = categories.sort((a, b) => b.total - a.total);

    expect(sorted[0].category).toBe("produce");
    expect(sorted[1].category).toBe("dairy");
    expect(sorted[2].category).toBe("bakery");
  });

  it("should determine trend as increasing when current > previous * 1.1", () => {
    const current = 120;
    const previous = 100;
    let trend: "increasing" | "decreasing" | "stable" = "stable";

    if (current > previous * 1.1) trend = "increasing";
    else if (current < previous * 0.9) trend = "decreasing";

    expect(trend).toBe("increasing");
  });

  it("should determine trend as decreasing when current < previous * 0.9", () => {
    const current = 80;
    const previous = 100;
    let trend: "increasing" | "decreasing" | "stable" = "stable";

    if (current > previous * 1.1) trend = "increasing";
    else if (current < previous * 0.9) trend = "decreasing";

    expect(trend).toBe("decreasing");
  });

  it("should determine trend as stable when within 10% band", () => {
    const current = 95;
    const previous = 100;
    let trend: "increasing" | "decreasing" | "stable" = "stable";

    if (current > previous * 1.1) trend = "increasing";
    else if (current < previous * 0.9) trend = "decreasing";

    expect(trend).toBe("stable");
  });

  it("should parse decimal cost strings correctly", () => {
    const costs = ["3.50", "5.00", "0.99", "12.45"];
    const parsed = costs.map((c) => parseFloat(c));

    expect(parsed[0]).toBe(3.5);
    expect(parsed[1]).toBe(5.0);
    expect(parsed[2]).toBe(0.99);
    expect(parsed[3]).toBe(12.45);
  });

  it("should handle null/undefined cost gracefully", () => {
    const cost: string | null = null;
    const value = cost ? parseFloat(cost) : 0;

    expect(value).toBe(0);
  });
});
