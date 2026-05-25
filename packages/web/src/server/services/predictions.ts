/**
 * Predictions service — purchase-pattern learning + depletion prediction.
 *
 * Derives per-item restock cadence from the durable `item_usage_history` log
 * (the "added" events) rather than a separate purchase table. Note: each
 * addItem creates a NEW item row, so the stable key for a logical item is its
 * NAME within a home — we group "added" events by normalized itemName.
 */

import {
  db,
  eq,
  and,
  asc,
  itemUsageHistoryTable,
  type ItemUsageHistory,
} from "@pantry-pixie/core";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_DAYS = 7; // fallback when there isn't enough history

export interface ItemFrequencyStats {
  itemName: string;
  itemId: string | null; // most recent item id seen for this name
  homeId: string;
  averageDaysBetweenPurchases: number;
  medianDaysBetweenPurchases: number;
  minDaysBetweenPurchases: number;
  maxDaysBetweenPurchases: number;
  standardDeviation: number;
  averageQuantity: number;
  purchaseCount: number;
  lastPurchasedAt: Date;
  nextPredictedAt: Date;
  confidence: number; // 0..1
}

export interface DepletionPrediction {
  itemName: string;
  itemId: string | null;
  predictedDepletionDate: Date;
  confidence: number;
  reasoning: string;
}

// ---- small hand-rolled stats (avoid a dependency) ----
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function stdDev(xs: number[], mu: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - mu) ** 2, 0) / xs.length);
}
const round = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** All "added" events for a home, oldest-first (for interval computation). */
async function getAddedEvents(homeId: string): Promise<ItemUsageHistory[]> {
  return db.query.itemUsageHistoryTable.findMany({
    where: and(
      eq(itemUsageHistoryTable.homeId, homeId),
      eq(itemUsageHistoryTable.action, "added"),
    ),
    orderBy: [asc(itemUsageHistoryTable.createdAt)],
  });
}

/** Compute frequency stats from a single item's "added" events (oldest-first). */
function statsForEvents(
  homeId: string,
  events: ItemUsageHistory[],
): ItemFrequencyStats | null {
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  const quantities = events.map((e) => e.quantity ?? 1);
  const averageQuantity = mean(quantities);

  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(
      (events[i].createdAt.getTime() - events[i - 1].createdAt.getTime()) /
        DAY_MS,
    );
  }

  // Single purchase: not enough to learn a cadence — low-confidence default.
  if (intervals.length === 0) {
    return {
      itemName: last.itemName,
      itemId: last.itemId,
      homeId,
      averageDaysBetweenPurchases: 0,
      medianDaysBetweenPurchases: 0,
      minDaysBetweenPurchases: 0,
      maxDaysBetweenPurchases: 0,
      standardDeviation: 0,
      averageQuantity: round(averageQuantity),
      purchaseCount: events.length,
      lastPurchasedAt: last.createdAt,
      nextPredictedAt: new Date(
        last.createdAt.getTime() + DEFAULT_INTERVAL_DAYS * DAY_MS,
      ),
      confidence: 0.3,
    };
  }

  const avg = mean(intervals);
  const med = median(intervals);
  const sd = stdDev(intervals, avg);
  const estimatedInterval = med || avg || DEFAULT_INTERVAL_DAYS;

  // Confidence: consistent intervals + larger samples = higher confidence.
  const coefficientOfVariation = avg > 0 ? sd / avg : 1;
  let confidence = 1 - Math.min(coefficientOfVariation, 1);
  if (events.length < 10) confidence *= events.length / 10;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    itemName: last.itemName,
    itemId: last.itemId,
    homeId,
    averageDaysBetweenPurchases: round(avg),
    medianDaysBetweenPurchases: round(med),
    minDaysBetweenPurchases: round(Math.min(...intervals)),
    maxDaysBetweenPurchases: round(Math.max(...intervals)),
    standardDeviation: round(sd),
    averageQuantity: round(averageQuantity),
    purchaseCount: events.length,
    lastPurchasedAt: last.createdAt,
    nextPredictedAt: new Date(
      last.createdAt.getTime() + estimatedInterval * DAY_MS,
    ),
    confidence: round2(confidence),
  };
}

function toPrediction(stats: ItemFrequencyStats): DepletionPrediction {
  const reasoning =
    stats.purchaseCount < 2
      ? `Only ${stats.purchaseCount} purchase logged — this is a rough default estimate.`
      : `Based on ${stats.purchaseCount} purchases, usually restocked about every ${stats.medianDaysBetweenPurchases} days.`;
  return {
    itemName: stats.itemName,
    itemId: stats.itemId,
    predictedDepletionDate: stats.nextPredictedAt,
    confidence: stats.confidence,
    reasoning,
  };
}

/** Frequency stats for one logical item (by name) in a home. */
export async function getItemFrequencyStats(
  homeId: string,
  itemName: string,
): Promise<ItemFrequencyStats | null> {
  const target = normalizeName(itemName);
  const events = (await getAddedEvents(homeId)).filter(
    (e) => normalizeName(e.itemName) === target,
  );
  return statsForEvents(homeId, events);
}

/** Predict when one logical item (by name) will next be needed. */
export async function predictItemDepletion(
  homeId: string,
  itemName: string,
): Promise<DepletionPrediction | null> {
  const stats = await getItemFrequencyStats(homeId, itemName);
  return stats ? toPrediction(stats) : null;
}

/** Predict depletion for every item the home has restocked, soonest-first. */
export async function predictAllDepletions(
  homeId: string,
): Promise<DepletionPrediction[]> {
  const events = await getAddedEvents(homeId);

  const groups = new Map<string, ItemUsageHistory[]>();
  for (const event of events) {
    const key = normalizeName(event.itemName);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const predictions: DepletionPrediction[] = [];
  for (const group of groups.values()) {
    const stats = statsForEvents(homeId, group);
    if (stats) predictions.push(toPrediction(stats));
  }

  return predictions.sort(
    (a, b) =>
      a.predictedDepletionDate.getTime() - b.predictedDepletionDate.getTime(),
  );
}
