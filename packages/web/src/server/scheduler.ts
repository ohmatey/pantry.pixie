/**
 * Background scheduler for recurring item restocking
 * Runs every 60 seconds and checks for items that need to be re-added to the default grocery list
 */

import {
  db,
  eq,
  and,
  itemsTable,
} from "@pantry-pixie/core";
import { getOrCreateDefaultList, addListItem } from "./services/grocery-lists";
import { logger } from "./lib/logger";

const INTERVAL_MS = 60_000; // 1 minute

/**
 * Calculate the next recurrence date based on interval type
 */
function calculateNextRecurrenceDate(
  from: Date,
  interval: string,
): Date {
  const next = new Date(from);
  switch (interval) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7); // default to weekly
  }
  return next;
}

/**
 * Process one tick: find recurring items due for restocking and add them to default lists
 */
async function processRecurringItems(): Promise<void> {
  const now = new Date();

  try {
    // Find all recurring items
    const recurringItems = await db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.isRecurring, true),
        eq(itemsTable.isChecked, false),
      ),
    });

    for (const item of recurringItems) {
      if (!item.recurringInterval) continue;

      // Check if it's time to restock: last notified is null or older than the interval
      let isDue = false;
      if (!item.recurringLastNotified) {
        // Never triggered — due immediately
        isDue = true;
      } else {
        const next = calculateNextRecurrenceDate(
          item.recurringLastNotified,
          item.recurringInterval,
        );
        isDue = now >= next;
      }

      if (!isDue) continue;

      try {
        // Add item to default grocery list for this home
        const defaultList = await getOrCreateDefaultList(item.homeId);
        await addListItem(item.homeId, defaultList.id, {
          itemId: item.id,
          quantity: item.quantity,
          notes: `Auto-added (recurring ${item.recurringInterval})`,
        });

        // Update recurringLastNotified
        await db
          .update(itemsTable)
          .set({ recurringLastNotified: now })
          .where(eq(itemsTable.id, item.id));

        logger.info(
          { itemId: item.id, itemName: item.name, homeId: item.homeId, interval: item.recurringInterval },
          "Recurring item re-added to default list",
        );
      } catch (itemErr) {
        logger.error(
          { err: itemErr, itemId: item.id, itemName: item.name },
          "Failed to process recurring item",
        );
      }
    }
  } catch (err) {
    logger.error({ err }, "Recurring item scheduler error");
  }
}

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerHandle) return; // already running

  logger.info({ intervalMs: INTERVAL_MS }, "Recurring item scheduler started");

  // Run immediately on startup, then on interval
  processRecurringItems().catch((err) =>
    logger.error({ err }, "Scheduler initial run error"),
  );

  schedulerHandle = setInterval(() => {
    processRecurringItems().catch((err) =>
      logger.error({ err }, "Scheduler tick error"),
    );
  }, INTERVAL_MS);
}

export function stopScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    logger.info("Recurring item scheduler stopped");
  }
}
