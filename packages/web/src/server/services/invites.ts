/**
 * Invite service — database-backed home invite codes. Codes persist across
 * server restarts (single-use, deleted on accept; 24h expiry swept on each op).
 */

import {
  db,
  eq,
  lte,
  inviteCodesTable,
  homesTable,
  homeMembersTable,
  usersTable,
} from "@pantry-pixie/core";
import { randomBytes } from "crypto";
import { notifyPartners } from "./notifications";

function generateCode(): string {
  return randomBytes(6).toString("hex"); // 12-char hex code
}

/** Sweep expired codes. Called at the start of each invite operation. */
async function cleanExpired(): Promise<void> {
  await db
    .delete(inviteCodesTable)
    .where(lte(inviteCodesTable.expiresAt, new Date()));
}

export async function createInvite(
  homeId: string,
  inviterId: string,
): Promise<{ code: string; expiresAt: Date }> {
  await cleanExpired();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db
    .insert(inviteCodesTable)
    .values({ code, homeId, inviterId, expiresAt });

  return { code, expiresAt };
}

export async function acceptInvite(
  code: string,
  userId: string,
): Promise<{ homeId: string; homeName: string; needsOnboarding: boolean }> {
  await cleanExpired();

  const entry = await db.query.inviteCodesTable.findFirst({
    where: eq(inviteCodesTable.code, code),
  });
  if (!entry) {
    throw new Error("Invalid or expired invite code");
  }

  if (entry.expiresAt < new Date()) {
    await db.delete(inviteCodesTable).where(eq(inviteCodesTable.code, code));
    throw new Error("Invite has expired");
  }

  // Check if already a member
  const existing = await db.query.homeMembersTable.findFirst({
    where: eq(homeMembersTable.userId, userId),
  });

  // If they're already in this home, just return it (no onboarding needed).
  if (existing?.homeId === entry.homeId) {
    const home = await db.query.homesTable.findFirst({
      where: eq(homesTable.id, entry.homeId),
    });
    return {
      homeId: entry.homeId,
      homeName: home?.name || "Kitchen",
      needsOnboarding: false,
    };
  }

  // Add user as member
  await db.insert(homeMembersTable).values({
    homeId: entry.homeId,
    userId,
    role: "member",
  });

  // Consume the invite
  await db.delete(inviteCodesTable).where(eq(inviteCodesTable.code, code));

  const home = await db.query.homesTable.findFirst({
    where: eq(homesTable.id, entry.homeId),
  });

  // Let the existing partner know someone joined their shared home.
  const joiner = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  await notifyPartners(entry.homeId, userId, {
    type: "partner_activity",
    title: `${joiner?.name || "Your partner"} joined your home`,
    body: "You're now sharing this pantry together.",
  }).catch(() => {
    /* non-critical */
  });

  // New member → the client should run them through a short preferences setup
  // so the second partner isn't a blank slate.
  return {
    homeId: entry.homeId,
    homeName: home?.name || "Kitchen",
    needsOnboarding: true,
  };
}

export async function getInviteInfo(
  code: string,
): Promise<{ homeName: string; inviterName: string; expiresAt: Date } | null> {
  await cleanExpired();

  const entry = await db.query.inviteCodesTable.findFirst({
    where: eq(inviteCodesTable.code, code),
  });
  if (!entry || entry.expiresAt < new Date()) {
    return null;
  }

  const home = await db.query.homesTable.findFirst({
    where: eq(homesTable.id, entry.homeId),
  });

  const inviter = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, entry.inviterId),
  });

  return {
    homeName: home?.name || "Kitchen",
    inviterName: inviter?.name || "Someone",
    expiresAt: entry.expiresAt,
  };
}

export async function getHomeMembers(homeId: string) {
  const memberships = await db.query.homeMembersTable.findMany({
    where: eq(homeMembersTable.homeId, homeId),
  });

  const members = [];
  for (const m of memberships) {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, m.userId),
    });
    if (user) {
      members.push({
        id: m.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      });
    }
  }

  return members;
}
