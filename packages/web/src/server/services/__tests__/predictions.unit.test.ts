/**
 * Unit tests for the predictions service (purchase-pattern learning).
 * Seeds deterministic item_usage_history "added" events and asserts the derived
 * cadence + depletion predictions.
 */

import { describe, it, expect, beforeAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import { db, itemUsageHistoryTable } from "@pantry-pixie/core";
import {
  getItemFrequencyStats,
  predictItemDepletion,
  predictAllDepletions,
} from "../predictions";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Tests require DATABASE_URL to be set", () => {});
} else {
  let homeId: string;

  beforeAll(async () => {
    const seed = await seedTestUser();
    homeId = seed.home.id;
  });

  // Insert "added" events for a logical item at the given ages (days ago).
  // Each insert uses a distinct itemId, mirroring how addItem creates a new
  // item row per add — so prediction must group by NAME, not id.
  async function seedAdded(
    home: string,
    name: string,
    daysAgoList: number[],
    qty = 1,
  ) {
    const now = Date.now();
    for (const daysAgo of daysAgoList) {
      await db.insert(itemUsageHistoryTable).values({
        homeId: home,
        itemId: crypto.randomUUID(),
        itemName: name,
        action: "added",
        quantity: qty,
        createdAt: new Date(now - daysAgo * DAY_MS),
      });
    }
  }

  describe("Predictions service", () => {
    it("predicts depletion from a consistent restock cadence", async () => {
      await seedAdded(homeId, "PredMilkA", [21, 14, 7, 0], 2);

      const stats = await getItemFrequencyStats(homeId, "PredMilkA");
      expect(stats).not.toBeNull();
      expect(stats!.purchaseCount).toBe(4);
      expect(stats!.medianDaysBetweenPurchases).toBe(7);
      expect(stats!.averageQuantity).toBe(2);

      const pred = await predictItemDepletion(homeId, "PredMilkA");
      expect(pred).not.toBeNull();
      const expected = Date.now() + 7 * DAY_MS;
      expect(
        Math.abs(pred!.predictedDepletionDate.getTime() - expected),
      ).toBeLessThan(DAY_MS); // within a day
      expect(pred!.confidence).toBeGreaterThan(0.3); // consistent cadence
    });

    it("returns a low-confidence default for a single purchase", async () => {
      await seedAdded(homeId, "PredEggsA", [0]);
      const pred = await predictItemDepletion(homeId, "PredEggsA");
      expect(pred).not.toBeNull();
      expect(pred!.confidence).toBe(0.3);
    });

    it("groups added events by name across distinct item ids (case-insensitive)", async () => {
      await seedAdded(homeId, "PredRice", [10, 5]);
      await seedAdded(homeId, "predrice", [0]); // same logical item, different case
      const stats = await getItemFrequencyStats(homeId, "PredRice");
      expect(stats!.purchaseCount).toBe(3);
    });

    it("sorts predictions soonest-first", async () => {
      await seedAdded(homeId, "PredFastB", [9, 6, 3, 0]); // ~3-day cadence → +3d
      await seedAdded(homeId, "PredSlowB", [60, 40, 20, 0]); // ~20-day cadence → +20d

      const all = await predictAllDepletions(homeId);
      const names = all.map((p) => p.itemName.toLowerCase());
      const fastIdx = names.indexOf("predfastb");
      const slowIdx = names.indexOf("predslowb");

      expect(fastIdx).toBeGreaterThanOrEqual(0);
      expect(slowIdx).toBeGreaterThanOrEqual(0);
      expect(fastIdx).toBeLessThan(slowIdx);
    });

    it("flags a well-established item as due soon with high confidence", async () => {
      // 8 purchases at a 7-day cadence, last one 6 days ago → next due ~1 day
      // out. This is the trigger condition the scheduler's low-stock pass uses
      // (confidence >= 0.5 AND due within 3 days).
      await seedAdded(homeId, "PredCadence", [55, 48, 41, 34, 27, 20, 13, 6]);
      const pred = await predictItemDepletion(homeId, "PredCadence");
      expect(pred).not.toBeNull();
      expect(pred!.confidence).toBeGreaterThanOrEqual(0.5);
      const dueInDays =
        (pred!.predictedDepletionDate.getTime() - Date.now()) / DAY_MS;
      expect(dueInDays).toBeLessThanOrEqual(3);
      expect(dueInDays).toBeGreaterThan(-1);
    });

    it("returns null for an item with no history", async () => {
      const stats = await getItemFrequencyStats(homeId, "NeverBoughtXYZ");
      expect(stats).toBeNull();
    });
  });
}
