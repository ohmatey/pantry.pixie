/**
 * Notifications service — durable in-app notifications for the household.
 * Persists what the ephemeral WebSocket broadcasts only show in the moment, so
 * an offline partner sees what happened when they return.
 */

import {
  db,
  eq,
  and,
  desc,
  notificationsTable,
  homeMembersTable,
  usersTable,
  type Notification,
} from "@pantry-pixie/core";

export type NotificationType =
  | "recurring_due"
  | "expiring_soon"
  | "partner_activity"
  | "sunday_sync"
  | "running_low";

/** Window during which repeated partner activity coalesces into one digest. */
const COALESCE_WINDOW_MS = 5 * 60_000; // 5 minutes

/** All known notification types — used to validate per-user mute preferences. */
export const NOTIFICATION_TYPES: NotificationType[] = [
  "recurring_due",
  "expiring_soon",
  "partner_activity",
  "sunday_sync",
  "running_low",
];

/** A user's muted notification types (parsed JSON array). Empty on absence/parse error. */
export async function getMutedTypes(
  userId: string,
): Promise<NotificationType[]> {
  const u = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!u?.mutedNotificationTypes) return [];
  try {
    const arr = JSON.parse(u.mutedNotificationTypes);
    return Array.isArray(arr) ? (arr as NotificationType[]) : [];
  } catch {
    return [];
  }
}

export interface NewNotificationInput {
  homeId: string;
  userId?: string | null; // null = whole household
  type: NotificationType;
  title: string;
  body?: string;
  refId?: string;
}

export async function createNotification(
  input: NewNotificationInput,
): Promise<Notification> {
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      homeId: input.homeId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      refId: input.refId,
    })
    .returning();
  return notification;
}

/**
 * Notifications visible to a user: those targeted at them plus whole-household
 * ones (userId === null).
 */
export async function listNotifications(
  homeId: string,
  userId: string,
): Promise<Notification[]> {
  const [rows, muted] = await Promise.all([
    db.query.notificationsTable.findMany({
      where: eq(notificationsTable.homeId, homeId),
      orderBy: [desc(notificationsTable.createdAt)],
      limit: 50,
    }),
    getMutedTypes(userId),
  ]);
  // Read-time mute filter also covers household-wide rows (userId === null) that
  // the scheduler creates as a single shared row — there's no per-recipient row
  // to suppress at write time, so a muted user hides them here.
  const mutedSet = new Set(muted);
  return rows.filter(
    (n) =>
      (n.userId === null || n.userId === userId) &&
      !mutedSet.has(n.type as NotificationType),
  );
}

export async function markNotificationRead(
  homeId: string,
  notificationId: string,
): Promise<Notification | undefined> {
  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.homeId, homeId),
      ),
    )
    .returning();
  return notification;
}

/** Fetch a single notification scoped to a home. */
export async function getNotification(
  homeId: string,
  id: string,
): Promise<Notification | undefined> {
  return db.query.notificationsTable.findFirst({
    where: and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.homeId, homeId),
    ),
  });
}

/**
 * Idempotency guard: is there already an unread notification of this type for
 * this entity? Used by the scheduler to avoid re-notifying every tick.
 */
export async function hasUnreadOfType(
  homeId: string,
  type: NotificationType,
  refId: string,
): Promise<boolean> {
  const rows = await db.query.notificationsTable.findMany({
    where: and(
      eq(notificationsTable.homeId, homeId),
      eq(notificationsTable.type, type),
      eq(notificationsTable.refId, refId),
      eq(notificationsTable.isRead, false),
    ),
    limit: 1,
  });
  return rows.length > 0;
}

/**
 * Has a notification of this type been created for the home within `windowMs`?
 * Used for time-windowed dedupe (e.g. the weekly Sunday Sync digest).
 */
export async function hasRecentOfType(
  homeId: string,
  type: NotificationType,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const rows = await db.query.notificationsTable.findMany({
    where: and(
      eq(notificationsTable.homeId, homeId),
      eq(notificationsTable.type, type),
    ),
    orderBy: [desc(notificationsTable.createdAt)],
    limit: 1,
  });
  return rows.length > 0 && rows[0].createdAt >= since;
}

/**
 * Merge a partner add/remove into one recipient's existing unread digest, when
 * one exists within the coalescing window and shares the same verb. Returns true
 * if it merged (caller then skips inserting a new row). Keeps the partner inbox
 * calm: a burst of adds becomes "Alex added 3 items", not three pings.
 */
async function coalescePartnerActivity(
  homeId: string,
  userId: string,
  refId: string | undefined,
  coalesce: { verb: "added" | "removed"; actorName: string },
): Promise<boolean> {
  const since = new Date(Date.now() - COALESCE_WINDOW_MS);
  const existing = await db.query.notificationsTable.findFirst({
    where: and(
      eq(notificationsTable.homeId, homeId),
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.type, "partner_activity"),
      eq(notificationsTable.isRead, false),
    ),
    orderBy: [desc(notificationsTable.updatedAt)],
  });
  if (!existing || existing.updatedAt < since) return false;
  // Only merge into item-activity rows (they carry an item refId); never into a
  // partner-join notification (refId null) which shares the partner_activity type.
  if (!existing.refId) return false;
  // Keep add and remove in separate digests — verb is derived from the title.
  const existingVerb = existing.title.includes("used up") ? "removed" : "added";
  if (existingVerb !== coalesce.verb) return false;

  const nextCount = existing.count + 1;
  const word = coalesce.verb === "added" ? "added" : "used up";
  await db
    .update(notificationsTable)
    .set({
      title: `${coalesce.actorName} ${word} ${nextCount} items`,
      count: nextCount,
      // refId points at the most-recent item; the inbox add-to-list action targets it.
      refId: refId ?? existing.refId,
      isRead: false,
      updatedAt: new Date(),
    })
    .where(eq(notificationsTable.id, existing.id));
  return true;
}

/**
 * Notify every household member EXCEPT the actor who triggered the event.
 * Skips recipients who have muted the notification type. When `coalesce` is set,
 * repeated partner activity merges into a running digest instead of new rows.
 */
export async function notifyPartners(
  homeId: string,
  actorId: string | undefined,
  input: Omit<NewNotificationInput, "homeId" | "userId"> & {
    coalesce?: { verb: "added" | "removed"; actorName: string };
  },
): Promise<void> {
  const { coalesce, ...notification } = input;
  const members = await db.query.homeMembersTable.findMany({
    where: eq(homeMembersTable.homeId, homeId),
  });
  await Promise.all(
    members
      .filter((m) => m.userId !== actorId)
      .map(async (m) => {
        const muted = await getMutedTypes(m.userId);
        if (muted.includes(notification.type)) return;
        if (
          coalesce &&
          (await coalescePartnerActivity(
            homeId,
            m.userId,
            notification.refId,
            coalesce,
          ))
        ) {
          return;
        }
        await createNotification({ homeId, userId: m.userId, ...notification });
      }),
  );
}
