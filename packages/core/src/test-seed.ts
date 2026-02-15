/**
 * Test seed utility — creates a known test user for e2e tests
 * Use seedTestUser() programmatically; do NOT import at module level
 * (it hits the DB immediately).
 */

import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  usersTable,
  homesTable,
  homeMembersTable,
  chatThreadsTable,
  chatMessagesTable,
} from "./schema";

export const TEST_EMAIL = "test@pantrypixie.com";
export const TEST_PASSWORD = "password123";
export const TEST_NAME = "Test User";

export interface SeedResult {
  user: { id: string; email: string; name: string };
  home: { id: string; name: string };
  thread: { id: string; title: string | null };
  credentials: { email: string; password: string };
}

/**
 * Seed (or re-seed) a test user with a home and chat thread.
 * Idempotent: deletes existing test user data and recreates from scratch.
 */
export async function seedTestUser(): Promise<SeedResult> {
  // Clean up existing test user if present
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, TEST_EMAIL),
  });

  if (existing) {
    // Delete in dependency order: messages -> threads -> members -> items -> homes -> user
    const homes = await db.query.homesTable.findMany({
      where: eq(homesTable.ownerId, existing.id),
    });

    for (const home of homes) {
      const threads = await db.query.chatThreadsTable.findMany({
        where: eq(chatThreadsTable.homeId, home.id),
      });
      for (const thread of threads) {
        await db.delete(chatMessagesTable).where(eq(chatMessagesTable.threadId, thread.id));
      }
      await db.delete(chatThreadsTable).where(eq(chatThreadsTable.homeId, home.id));
      await db.delete(homeMembersTable).where(eq(homeMembersTable.homeId, home.id));
    }
    await db.delete(homesTable).where(eq(homesTable.ownerId, existing.id));
    await db.delete(usersTable).where(eq(usersTable.id, existing.id));
  }

  // Create user
  const passwordHash = await Bun.password.hash(TEST_PASSWORD, {
    algorithm: "argon2id",
  });

  const [user] = await db
    .insert(usersTable)
    .values({
      email: TEST_EMAIL,
      name: TEST_NAME,
      passwordHash,
      isVerified: true,
    })
    .returning();

  // Create home
  const [home] = await db
    .insert(homesTable)
    .values({
      name: "Test Kitchen",
      description: "E2E test home",
      ownerId: user.id,
      currency: "USD",
      monthlyBudget: 500,
    })
    .returning();

  // Add owner membership
  await db.insert(homeMembersTable).values({
    homeId: home.id,
    userId: user.id,
    role: "owner",
  });

  // Create chat thread
  const [thread] = await db
    .insert(chatThreadsTable)
    .values({
      homeId: home.id,
      title: "Test Thread",
    })
    .returning();

  return {
    user: { id: user.id, email: user.email, name: user.name },
    home: { id: home.id, name: home.name },
    thread: { id: thread.id, title: thread.title },
    credentials: { email: TEST_EMAIL, password: TEST_PASSWORD },
  };
}
