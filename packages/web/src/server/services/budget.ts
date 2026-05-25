/**
 * Budget service — spending calculation + non-judgmental insights.
 *
 * Source of truth: each priced item add (`items.price` at `dateAdded`) is a
 * purchase signal. Insights therefore reflect items that have a price logged.
 */

import { db, itemsTable, homesTable, eq, and, gte } from "@pantry-pixie/core";

export type TimePeriod = "week" | "month" | "all-time";
export type InsightPeriod = "week" | "month";

export interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  averagePerItem: number;
}

export interface StoreSpending {
  store: string;
  total: number;
  itemCount: number;
}

interface SpendingBase {
  total: number;
  byCategory: CategorySpending[];
  byStore: StoreSpending[];
  itemCount: number;
  averagePerItem: number;
}

export interface BudgetSummary extends SpendingBase {
  period: TimePeriod;
  startDate?: Date;
  endDate: Date;
}

export interface SpendingComparison {
  previousTotal: number;
  changePercent: number; // signed; positive = spent more than previous window
  trend: "up" | "down" | "stable";
}

export interface BudgetStatus {
  monthlyBudget: number;
  percentUsed: number;
  remaining: number;
  status: "on_track" | "heads_up" | "over";
}

export interface SpendingInsight extends SpendingBase {
  period: InsightPeriod;
  comparison?: SpendingComparison;
  budget?: BudgetStatus;
  insights: string[]; // non-judgmental, fact-based observations
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DEADBAND = 7; // ±% treated as "stable"

const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: "฿",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

/** Format an amount with a currency symbol. Defaults to Thai Baht (the market). */
export function formatMoney(amount: number, currency = "THB"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "฿";
  return `${symbol}${amount.toFixed(2)}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Aggregate priced items added in [start, end). `start = null` = no lower bound.
 * `end` is exclusive so adjacent windows don't double-count the boundary.
 */
export async function calculateSpendingBetween(
  homeId: string,
  start: Date | null,
  end: Date,
): Promise<SpendingBase> {
  const conditions = [eq(itemsTable.homeId, homeId)];
  if (start) conditions.push(gte(itemsTable.dateAdded, start));

  const rows = await db
    .select({
      category: itemsTable.category,
      store: itemsTable.store,
      price: itemsTable.price,
      dateAdded: itemsTable.dateAdded,
    })
    .from(itemsTable)
    .where(and(...conditions));

  let total = 0;
  let itemCount = 0;
  const categoryMap = new Map<string, CategorySpending>();
  const storeMap = new Map<string, StoreSpending>();

  for (const item of rows) {
    if (item.dateAdded >= end) continue; // exclusive upper bound
    const cost = item.price || 0;
    if (cost <= 0) continue;

    total += cost;
    itemCount += 1;
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

    // Spend-by-store: only items with a known purchase source (from receipts).
    if (item.store && item.store.trim()) {
      const store = item.store.trim();
      const s = storeMap.get(store);
      if (s) {
        s.total += cost;
        s.itemCount += 1;
      } else {
        storeMap.set(store, { store, total: cost, itemCount: 1 });
      }
    }
  }

  const byCategory = Array.from(categoryMap.values())
    .map((c) => ({ ...c, averagePerItem: c.total / c.itemCount }))
    .sort((a, b) => b.total - a.total);

  const byStore = Array.from(storeMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return {
    total,
    byCategory,
    byStore,
    itemCount,
    averagePerItem: itemCount > 0 ? total / itemCount : 0,
  };
}

function windowFor(period: TimePeriod): { start: Date | null; end: Date } {
  const end = new Date();
  if (period === "week") return { start: daysAgo(7), end };
  if (period === "month") return { start: daysAgo(30), end };
  return { start: null, end }; // all-time
}

/** Spending for a home within a named period. */
export async function calculateSpending(
  homeId: string,
  period: TimePeriod = "month",
): Promise<BudgetSummary> {
  const { start, end } = windowFor(period);
  const base = await calculateSpendingBetween(homeId, start, end);
  return { ...base, period, startDate: start ?? undefined, endDate: end };
}

function biggestCategoryMover(
  current: SpendingBase,
  previous: SpendingBase,
): { category: string; delta: number } | null {
  const prev = new Map(previous.byCategory.map((c) => [c.category, c.total]));
  let top: { category: string; delta: number } | null = null;
  for (const c of current.byCategory) {
    const delta = c.total - (prev.get(c.category) ?? 0);
    if (!top || delta > top.delta) top = { category: c.category, delta };
  }
  return top && top.delta > 0 ? top : null;
}

function buildInsights(
  current: SpendingBase,
  previous: SpendingBase,
  comparison: SpendingComparison | undefined,
  budget: BudgetStatus | undefined,
  period: InsightPeriod,
): string[] {
  if (current.total === 0) {
    return [
      `No priced items logged this ${period} yet — add prices and I'll spot patterns for you.`,
    ];
  }

  const out: string[] = [];
  const top = current.byCategory[0];
  if (top) {
    out.push(
      `${cap(top.category)} was your biggest category this ${period} (${Math.round((top.total / current.total) * 100)}%).`,
    );
  }

  const topStore = current.byStore[0];
  if (topStore) {
    out.push(
      `Most of this ${period}'s spend was at ${topStore.store} (${Math.round((topStore.total / current.total) * 100)}%).`,
    );
  }

  const mover = biggestCategoryMover(current, previous);
  if (mover) {
    out.push(
      `${cap(mover.category)} is up the most compared to the previous ${period}.`,
    );
  }

  if (comparison) {
    if (comparison.trend === "down") {
      out.push(
        `Spending is down ${Math.abs(Math.round(comparison.changePercent))}% versus the previous ${period}.`,
      );
    } else if (comparison.trend === "up") {
      out.push(
        `Spending is up ${Math.round(comparison.changePercent)}% versus the previous ${period} — just so you both know.`,
      );
    }
  }

  if (budget) {
    if (budget.status === "on_track") {
      out.push(
        `You're at ${Math.round(budget.percentUsed)}% of your monthly budget — plenty of room.`,
      );
    } else if (budget.status === "heads_up") {
      out.push(
        `You're at ${Math.round(budget.percentUsed)}% of your monthly budget this month.`,
      );
    } else {
      out.push(
        `You're a little over your monthly budget this month — no worries, want to plan the rest of the month together?`,
      );
    }
  }

  return out;
}

/**
 * Period-over-period spending insight with non-judgmental framing. Compares the
 * current window to the immediately preceding window of equal length, and (when
 * a monthly budget is set) reports month-to-date budget usage.
 */
export async function getSpendingInsight(
  homeId: string,
  period: InsightPeriod = "month",
): Promise<SpendingInsight> {
  const windowDays = period === "week" ? 7 : 30;
  const now = new Date();
  const start = daysAgo(windowDays);
  const prevStart = daysAgo(windowDays * 2);

  const [current, previous, home] = await Promise.all([
    calculateSpendingBetween(homeId, start, now),
    calculateSpendingBetween(homeId, prevStart, start),
    db.query.homesTable.findFirst({ where: eq(homesTable.id, homeId) }),
  ]);

  let comparison: SpendingComparison | undefined;
  if (previous.total > 0) {
    const changePercent =
      ((current.total - previous.total) / previous.total) * 100;
    comparison = {
      previousTotal: previous.total,
      changePercent,
      trend:
        changePercent > TREND_DEADBAND
          ? "up"
          : changePercent < -TREND_DEADBAND
            ? "down"
            : "stable",
    };
  }

  // Budget-vs-actual always reflects the monthly budget vs month-to-date spend.
  let budget: BudgetStatus | undefined;
  if (home?.monthlyBudget && home.monthlyBudget > 0) {
    const monthSpend =
      period === "month"
        ? current.total
        : (await calculateSpendingBetween(homeId, daysAgo(30), now)).total;
    const percentUsed = (monthSpend / home.monthlyBudget) * 100;
    budget = {
      monthlyBudget: home.monthlyBudget,
      percentUsed,
      remaining: home.monthlyBudget - monthSpend,
      status:
        percentUsed < 80 ? "on_track" : percentUsed <= 100 ? "heads_up" : "over",
    };
  }

  return {
    period,
    total: current.total,
    byCategory: current.byCategory,
    byStore: current.byStore,
    itemCount: current.itemCount,
    averagePerItem: current.averagePerItem,
    comparison,
    budget,
    insights: buildInsights(current, previous, comparison, budget, period),
  };
}

/** Week + month insights — consumed by the budget UI and the queryBudget tool. */
export async function getBudgetSummary(homeId: string): Promise<{
  week: SpendingInsight;
  month: SpendingInsight;
}> {
  const [week, month] = await Promise.all([
    getSpendingInsight(homeId, "week"),
    getSpendingInsight(homeId, "month"),
  ]);
  return { week, month };
}
