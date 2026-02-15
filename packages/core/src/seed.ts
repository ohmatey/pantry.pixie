/**
 * Seed script — creates a test user and home for development
 * Run: bun run packages/core/src/seed.ts
 */

import { db } from "./db";
import { usersTable, homesTable, homeMembersTable, chatThreadsTable } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await Bun.password.hash("password123", {
    algorithm: "argon2id",
  });

  const [user] = await db
    .insert(usersTable)
    .values({
      email: "test@pantrypixie.com",
      name: "Test User",
      passwordHash,
      isVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log("User already exists, looking up...");
    const existing = await db.query.usersTable.findFirst({
      where: (users, { eq }) => eq(users.email, "test@pantrypixie.com"),
    });
    if (existing) {
      console.log(`User: ${existing.email} (${existing.id})`);
      // Find their home
      const home = await db.query.homesTable.findFirst({
        where: (homes, { eq }) => eq(homes.ownerId, existing.id),
      });
      if (home) {
        console.log(`Home: ${home.name} (${home.id})`);
      }
    }
    console.log("Seed complete (no changes).");
    process.exit(0);
  }

  console.log(`Created user: ${user.email} (${user.id})`);

  // Create default home
  const [home] = await db
    .insert(homesTable)
    .values({
      name: "My Kitchen",
      description: "Default home for testing",
      ownerId: user.id,
      currency: "USD",
      monthlyBudget: 500,
    })
    .returning();

  console.log(`Created home: ${home.name} (${home.id})`);

  // Add user as home member (owner)
  await db.insert(homeMembersTable).values({
    homeId: home.id,
    userId: user.id,
    role: "owner",
  });

  // Create initial chat thread
  const [thread] = await db
    .insert(chatThreadsTable)
    .values({
      homeId: home.id,
      title: "Welcome Chat",
    })
    .returning();

  console.log(`Created chat thread: ${thread.id}`);

  console.log("\nSeed complete!");
  console.log(`  Email: test@pantrypixie.com`);
  console.log(`  Password: password123`);
  console.log(`  Home ID: ${home.id}`);
  console.log(`  Thread ID: ${thread.id}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
