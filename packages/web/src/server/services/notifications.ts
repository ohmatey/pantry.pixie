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
  type Notification,
} from "@pantry-pixie/core";

export type NotificationType =
  | "recurring_due"
  | "expiring_soon"
  | "partner_activity"
  | "sunday_sync"
  | "running_low";

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
  const rows = await db.query.notificationsTable.findMany({
    where: eq(notificationsTable.homeId, homeId),
    orderBy: [desc(notificationsTable.createdAt)],
    limit: 50,
  });
  return rows.filter((n) => n.userId === null || n.userId === userId);
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
 * Notify every household member EXCEPT the actor who triggered the event.
 */
export async function notifyPartners(
  homeId: string,
  actorId: string | undefined,
  input: Omit<NewNotificationInput, "homeId" | "userId">,
): Promise<void> {
  const members = await db.query.homeMembersTable.findMany({
    where: eq(homeMembersTable.homeId, homeId),
  });
  await Promise.all(
    members
      .filter((m) => m.userId !== actorId)
      .map((m) =>
        createNotification({ homeId, userId: m.userId, ...input }),
      ),
  );
}
