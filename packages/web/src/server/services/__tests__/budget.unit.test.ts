/**
 * Unit tests for the budget service — spending windows, period-over-period
 * comparison, category trend, and budget-vs-actual (non-judgmental insights).
 */

import { describe, it, expect, beforeAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import { db, itemsTable } from "@pantry-pixie/core";
import {
  calculateSpendingBetween,
  getSpendingInsight,
  formatMoney,
} from "../budget";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Tests require DATABASE_URL to be set", () => {});
} else {
  let homeId: string; // seedTestUser home has monthlyBudget: 500

  async function seedItem(
    home: string,
    name: string,
    category: string,
    price: number,
    daysAgoVal: number,
  ) {
    await db.insert(itemsTable).values({
      homeId: home,
      name,
      category,
      price,
      quantity: 1,
      dateAdded: new Date(Date.now() - daysAgoVal * DAY_MS),
    });
  }

  beforeAll(async () => {
    const seed = await seedTestUser();
    homeId = seed.home.id;

    // Current month (last 30d): dairy 120 (3d) + dairy 80 (10d) + produce 50 (12d) = 250
    await seedItem(homeId, "Milk", "dairy", 120, 3);
    await seedItem(homeId, "Cheese", "dairy", 80, 10);
    await seedItem(homeId, "Apples", "produce", 50, 12);
    // Previous month (30–60d ago): pantry 100 (40d)
    await seedItem(homeId, "Rice", "pantry", 100, 40);
  });

  describe("formatMoney", () => {
    it("formats Thai Baht by default", () => {
      expect(formatMoney(250)).toBe("฿250.00");
    });
  });

  describe("calculateSpendingBetween", () => {
    it("sums priced items in the current month window by category", async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * DAY_MS);
      const res = await calculateSpendingBetween(homeId, start, now);
      expect(res.total).toBe(250);
      expect(res.itemCount).toBe(3);
      expect(res.byCategory[0].category).toBe("dairy"); // 200, highest
      expect(res.byCategory[0].total).toBe(200);
    });

    it("excludes items outside the window (exclusive upper bound)", async () => {
      const now = new Date();
      const prevStart = new Date(now.getTime() - 60 * DAY_MS);
      const prevEnd = new Date(now.getTime() - 30 * DAY_MS);
      const res = await calculateSpendingBetween(homeId, prevStart, prevEnd);
      expect(res.total).toBe(100); // only the 40d-ago pantry item
    });
  });

  describe("getSpendingInsight - month", () => {
    it("computes a real period-over-period comparison (up)", async () => {
      const insight = await getSpendingInsight(homeId, "month");
      expect(insight.total).toBe(250);
      expect(insight.comparison).toBeDefined();
      expect(insight.comparison!.previousTotal).toBe(100);
      expect(insight.comparison!.changePercent).toBe(150);
      expect(insight.comparison!.trend).toBe("up");
    });

    it("reports budget-vs-actual against the home's monthly budget", async () => {
      const insight = await getSpendingInsight(homeId, "month");
      expect(insight.budget).toBeDefined();
      expect(insight.budget!.monthlyBudget).toBe(500);
      expect(insight.budget!.percentUsed).toBe(50); // 250 / 500
      expect(insight.budget!.remaining).toBe(250);
      expect(insight.budget!.status).toBe("on_track");
    });

    it("surfaces non-judgmental, fact-based insight strings", async () => {
      const insight = await getSpendingInsight(homeId, "month");
      expect(insight.insights.length).toBeGreaterThan(0);
      // top category + budget framing
      expect(insight.insights.join(" ")).toContain("Dairy");
      expect(insight.insights.join(" ").toLowerCase()).toContain("budget");
    });
  });

  describe("getSpendingInsight - week", () => {
    it("compares this week to the prior week", async () => {
      const insight = await getSpendingInsight(homeId, "week");
      expect(insight.total).toBe(120); // only the 3d-ago item this week
      // prior week (7–14d ago) had 80 + 50 = 130 → slightly down
      expect(insight.comparison!.trend).toBe("down");
      // budget block still reflects month-to-date spend vs monthly budget
      expect(insight.budget!.percentUsed).toBe(50);
    });
  });
}
