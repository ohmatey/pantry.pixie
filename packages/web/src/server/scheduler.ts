/**
 * Background scheduler. Runs every 60 seconds and:
 *  - re-adds due recurring items to the default grocery list (+ notifies)
 *  - nudges about items expiring soon
 *  - posts a weekly "Sunday Sync" digest the couple can gather around
 */

import {
  db,
  eq,
  and,
  desc,
  itemsTable,
  itemUsageHistoryTable,
  homeMembersTable,
  chatThreadsTable,
  chatMessagesTable,
} from "@pantry-pixie/core";
import { getOrCreateDefaultList, addListItem } from "./services/grocery-lists";
import {
  createNotification,
  hasUnreadOfType,
  hasRecentOfType,
} from "./services/notifications";
import { generateSundaySyncDigest } from "./agent";
import { logger } from "./lib/logger";

const INTERVAL_MS = 60_000; // 1 minute
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOW_MS = 3 * DAY_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * Calculate the next recurrence date based on interval type
 */
function calculateNextRecurrenceDate(from: Date, interval: string): Date {
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
 * Find recurring items due for restocking and add them to default lists.
 */
async function processRecurringItems(): Promise<void> {
  const now = new Date();

  try {
    const recurringItems = await db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.isRecurring, true),
        eq(itemsTable.isChecked, false),
      ),
    });

    for (const item of recurringItems) {
      if (!item.recurringInterval) continue;

      let isDue = false;
      if (!item.recurringLastNotified) {
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
        const defaultList = await getOrCreateDefaultList(item.homeId);
        await addListItem(item.homeId, defaultList.id, {
          itemId: item.id,
          quantity: item.quantity,
          notes: `Auto-added (recurring ${item.recurringInterval})`,
        });

        // recurringLastNotified is the idempotency guard — we only reach here
        // once per interval, so it's safe to notify each time.
        await db
          .update(itemsTable)
          .set({ recurringLastNotified: now })
          .where(eq(itemsTable.id, item.id));

        await createNotification({
          homeId: item.homeId,
          type: "recurring_due",
          title: `Time to restock ${item.name}`,
          body: `Added to your shopping list (recurring ${item.recurringInterval}).`,
          refId: item.id,
        });

        logger.info(
          {
            itemId: item.id,
            itemName: item.name,
            homeId: item.homeId,
            interval: item.recurringInterval,
          },
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

/**
 * Nudge about items expiring within the warning window. One notification per
 * item (idempotent via the unread-of-type guard).
 */
async function processExpiringItems(): Promise<void> {
  const now = Date.now();

  try {
    const items = await db.query.itemsTable.findMany({
      where: eq(itemsTable.isChecked, false),
    });

    for (const item of items) {
      if (!item.expiresAt) continue;
      const ms = item.expiresAt.getTime() - now;
      // Within the window, and not long-expired (avoid nagging about old items).
      if (ms > EXPIRY_WINDOW_MS || ms < -2 * DAY_MS) continue;
      if (await hasUnreadOfType(item.homeId, "expiring_soon", item.id)) continue;

      const days = Math.ceil(ms / DAY_MS);
      const when =
        days < 0
          ? "has expired"
          : days === 0
            ? "expires today"
            : `expires in ${days}d`;

      await createNotification({
        homeId: item.homeId,
        type: "expiring_soon",
        title: `${item.name} ${when}`,
        body: "Use it up before it goes to waste — ask Pixie for a recipe idea!",
        refId: item.id,
      });
    }
  } catch (err) {
    logger.error({ err }, "Expiry scheduler error");
  }
}

async function getOrCreateSundaySyncThread(homeId: string): Promise<string> {
  const existing = await db.query.chatThreadsTable.findMany({
    where: eq(chatThreadsTable.homeId, homeId),
    orderBy: [desc(chatThreadsTable.updatedAt)],
    limit: 50,
  });
  const found = existing.find((t) => t.title === "Sunday Sync");
  if (found) return found.id;

  const [thread] = await db
    .insert(chatThreadsTable)
    .values({ homeId, title: "Sunday Sync" })
    .returning();
  return thread.id;
}

/**
 * Weekly digest. Gated to Sundays and deduped to once per home per week.
 */
async function processSundaySync(): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 0) return; // Sundays only

  try {
    const homes = await db.query.homesTable.findMany();

    for (const home of homes) {
      try {
        // Once per home per week.
        if (await hasRecentOfType(home.id, "sunday_sync", 6 * DAY_MS)) continue;

        const members = await db.query.homeMembersTable.findMany({
          where: eq(homeMembersTable.homeId, home.id),
          with: { user: true },
        });
        const partnerNames = members
          .map((m) => m.user?.name)
          .filter((n): n is string => !!n);

        // This week's item activity.
        const history = await db.query.itemUsageHistoryTable.findMany({
          where: eq(itemUsageHistoryTable.homeId, home.id),
          orderBy: [desc(itemUsageHistoryTable.createdAt)],
          limit: 200,
        });
        const weekAgo = now.getTime() - WEEK_MS;
        const week = history.filter((h) => h.createdAt.getTime() >= weekAgo);
        const addedCount = week.filter((h) => h.action === "added").length;
        const removedCount = week.filter((h) => h.action === "removed").length;

        const items = await db.query.itemsTable.findMany({
          where: eq(itemsTable.homeId, home.id),
        });
        const expiring = items
          .filter(
            (i) =>
              i.expiresAt &&
              i.expiresAt.getTime() - now.getTime() <= EXPIRY_WINDOW_MS,
          )
          .map((i) => i.name)
          .slice(0, 8);
        const recurringDue = items
          .filter((i) => i.isRecurring)
          .map((i) => i.name)
          .slice(0, 8);

        const digest = await generateSundaySyncDigest({
          partnerNames,
          addedCount,
          removedCount,
          expiring,
          recurringDue,
        });
        if (!digest) continue; // mock/test mode or generation failed

        const threadId = await getOrCreateSundaySyncThread(home.id);
        await db.insert(chatMessagesTable).values({
          threadId,
          role: "assistant",
          content: digest,
          intent: "other",
        });
        await db
          .update(chatThreadsTable)
          .set({ updatedAt: now })
          .where(eq(chatThreadsTable.id, threadId));

        await createNotification({
          homeId: home.id,
          type: "sunday_sync",
          title: "Your Sunday Sync is ready",
          body: "Pixie summarised your week and what's ahead.",
          refId: threadId,
        });

        logger.info({ homeId: home.id }, "Sunday Sync digest posted");
      } catch (homeErr) {
        logger.error({ err: homeErr, homeId: home.id }, "Sunday Sync failed");
      }
    }
  } catch (err) {
    logger.error({ err }, "Sunday Sync scheduler error");
  }
}

async function processTick(): Promise<void> {
  await processRecurringItems();
  await processExpiringItems();
  await processSundaySync();
}

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerHandle) return; // already running

  logger.info({ intervalMs: INTERVAL_MS }, "Household scheduler started");

  processTick().catch((err) =>
    logger.error({ err }, "Scheduler initial run error"),
  );

  schedulerHandle = setInterval(() => {
    processTick().catch((err) => logger.error({ err }, "Scheduler tick error"));
  }, INTERVAL_MS);
}

export function stopScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    logger.info("Household scheduler stopped");
  }
}
