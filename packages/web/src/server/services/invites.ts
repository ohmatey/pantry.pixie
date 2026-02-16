/**
 * Invite service — in-memory invite code management for MVP
 */

import {
  db,
  eq,
  homesTable,
  homeMembersTable,
  usersTable,
} from "@pantry-pixie/core";
import { randomBytes } from "crypto";

interface InviteEntry {
  code: string;
  homeId: string;
  inviterId: string;
  expiresAt: Date;
}

// In-memory store with 24hr expiry
const invites = new Map<string, InviteEntry>();

function generateCode(): string {
  return randomBytes(6).toString("hex"); // 12-char hex code
}

function cleanExpired() {
  const now = new Date();
  for (const [code, entry] of invites) {
    if (entry.expiresAt < now) {
      invites.delete(code);
    }
  }
}

export function createInvite(
  homeId: string,
  inviterId: string,
): { code: string; expiresAt: Date } {
  cleanExpired();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  invites.set(code, { code, homeId, inviterId, expiresAt });

  return { code, expiresAt };
}

export async function acceptInvite(
  code: string,
  userId: string,
): Promise<{ homeId: string; homeName: string }> {
  cleanExpired();

  const entry = invites.get(code);
  if (!entry) {
    throw new Error("Invalid or expired invite code");
  }

  if (entry.expiresAt < new Date()) {
    invites.delete(code);
    throw new Error("Invite has expired");
  }

  // Check if already a member
  const existing = await db.query.homeMembersTable.findFirst({
    where: eq(homeMembersTable.userId, userId),
  });

  // If they're already in this home, just return it
  if (existing?.homeId === entry.homeId) {
    const home = await db.query.homesTable.findFirst({
      where: eq(homesTable.id, entry.homeId),
    });
    return { homeId: entry.homeId, homeName: home?.name || "Kitchen" };
  }

  // Add user as member
  await db.insert(homeMembersTable).values({
    homeId: entry.homeId,
    userId,
    role: "member",
  });

  // Consume the invite
  invites.delete(code);

  const home = await db.query.homesTable.findFirst({
    where: eq(homesTable.id, entry.homeId),
  });

  return { homeId: entry.homeId, homeName: home?.name || "Kitchen" };
}

export async function getInviteInfo(
  code: string,
): Promise<{ homeName: string; inviterName: string; expiresAt: Date } | null> {
  cleanExpired();

  const entry = invites.get(code);
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
