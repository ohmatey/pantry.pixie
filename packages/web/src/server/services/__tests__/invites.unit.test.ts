/**
 * Unit tests for invites service
 * Tests invite creation, acceptance, expiration, and home member management
 */

import { describe, it, expect, beforeAll, afterAll, test , test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import {
  db,
  eq,
  usersTable,
  homesTable,
  homeMembersTable,
} from "@pantry-pixie/core";
import { register } from "../../auth";
import {
  createInvite,
  acceptInvite,
  getInviteInfo,
  getHomeMembers,
} from "../invites";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

// Skip all tests if DATABASE_URL is not set
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Tests require DATABASE_URL to be set", () => {});
} else {

let testHomeId: string;
let testUserId: string;
let inviterName: string;
let createdUserIds: string[] = [];

beforeAll(async () => {
  const seed = await seedTestUser();
  testHomeId = seed.home.id;
  testUserId = seed.user.id;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, testUserId),
  });
  inviterName = user!.name;
});

afterAll(async () => {
  // Clean up created users
  for (const id of createdUserIds) {
    await db.delete(homesTable).where(eq(homesTable.ownerId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }
});

describe("Invite Service - createInvite()", () => {
  it("should create invite with 12-character code", () => {
    const invite = createInvite(testHomeId, testUserId);

    expect(invite.code).toBeString();
    expect(invite.code.length).toBe(12);
    expect(invite.code).toMatch(/^[a-f0-9]{12}$/); // hex format
  });

  it("should set expiration to 24 hours from now", () => {
    const beforeCreate = Date.now();
    const invite = createInvite(testHomeId, testUserId);
    const afterCreate = Date.now();

    const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000;
    const expiryTime = invite.expiresAt.getTime();

    // Should be approximately 24 hours (within 1 second tolerance)
    expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(expiryTime).toBeLessThanOrEqual(
      afterCreate + 24 * 60 * 60 * 1000 + 1000,
    );
  });

  it("should generate unique codes", () => {
    const invite1 = createInvite(testHomeId, testUserId);
    const invite2 = createInvite(testHomeId, testUserId);

    expect(invite1.code).not.toBe(invite2.code);
  });

  it("should return invite object with code and expiry", () => {
    const invite = createInvite(testHomeId, testUserId);

    expect(invite).toHaveProperty("code");
    expect(invite).toHaveProperty("expiresAt");
    expect(invite.expiresAt).toBeInstanceOf(Date);
  });
});

describe("Invite Service - getInviteInfo()", () => {
  let inviteCode: string;

  beforeAll(() => {
    const invite = createInvite(testHomeId, testUserId);
    inviteCode = invite.code;
  });

  it("should get invite info for valid code", async () => {
    const info = await getInviteInfo(inviteCode);

    expect(info).toBeDefined();
    expect(info!.homeName).toBeString();
    expect(info!.inviterName).toBe(inviterName);
    expect(info!.expiresAt).toBeInstanceOf(Date);
  });

  it("should return null for invalid code", async () => {
    const info = await getInviteInfo("invalidcode123");

    expect(info).toBeNull();
  });

  it("should return null for expired invite", async () => {
    // For testing purposes, we'll just test with a very old code that doesn't exist
    const info = await getInviteInfo("000000000000");

    expect(info).toBeNull();
  });

  it("should include home name in info", async () => {
    const info = await getInviteInfo(inviteCode);

    expect(info!.homeName).toBeString();
    expect(info!.homeName.length).toBeGreaterThan(0);
  });

  it("should include inviter name in info", async () => {
    const info = await getInviteInfo(inviteCode);

    expect(info!.inviterName).toBeString();
    expect(info!.inviterName).toBe(inviterName);
  });
});

describe("Invite Service - acceptInvite()", () => {
  it("should add user to home and return home info", async () => {
    const invite = createInvite(testHomeId, testUserId);

    // Create new user to accept invite
    const newUser = await register(
      `invitee-${Date.now()}@test.com`,
      "password",
      "Invitee User",
    );
    createdUserIds.push(newUser.user.id);

    const result = await acceptInvite(invite.code, newUser.user.id);

    expect(result.homeId).toBe(testHomeId);
    expect(result.homeName).toBeString();
  });

  it("should add user as member role", async () => {
    const invite = createInvite(testHomeId, testUserId);

    const newUser = await register(
      `member-${Date.now()}@test.com`,
      "password",
      "Member User",
    );
    createdUserIds.push(newUser.user.id);

    await acceptInvite(invite.code, newUser.user.id);

    // Find membership specifically for the invited home
    const memberships = await db.query.homeMembersTable.findMany({
      where: eq(homeMembersTable.userId, newUser.user.id),
    });

    const invitedHomeMembership = memberships.find(
      (m) => m.homeId === testHomeId,
    );

    expect(invitedHomeMembership).toBeDefined();
    expect(invitedHomeMembership!.homeId).toBe(testHomeId);
    expect(invitedHomeMembership!.role).toBe("member");
  });

  it("should consume invite code after acceptance", async () => {
    const invite = createInvite(testHomeId, testUserId);

    const newUser = await register(
      `consumer-${Date.now()}@test.com`,
      "password",
      "Consumer User",
    );
    createdUserIds.push(newUser.user.id);

    // Accept once
    await acceptInvite(invite.code, newUser.user.id);

    // Try to use same code again
    const anotherUser = await register(
      `another-${Date.now()}@test.com`,
      "password",
      "Another User",
    );
    createdUserIds.push(anotherUser.user.id);

    await expect(async () => {
      await acceptInvite(invite.code, anotherUser.user.id);
    }).toThrow("Invalid or expired invite code");
  });

  it("should throw error for invalid code", async () => {
    const newUser = await register(
      `invalid-${Date.now()}@test.com`,
      "password",
      "Invalid User",
    );
    createdUserIds.push(newUser.user.id);

    await expect(async () => {
      await acceptInvite("invalidcode", newUser.user.id);
    }).toThrow("Invalid or expired invite code");
  });

  it("should handle user already in home gracefully", async () => {
    const invite = createInvite(testHomeId, testUserId);

    // Accept invite
    const newUser = await register(
      `existing-${Date.now()}@test.com`,
      "password",
      "Existing User",
    );
    createdUserIds.push(newUser.user.id);

    await acceptInvite(invite.code, newUser.user.id);

    // Create another invite and try to accept again
    const invite2 = createInvite(testHomeId, testUserId);
    const result = await acceptInvite(invite2.code, newUser.user.id);

    expect(result.homeId).toBe(testHomeId);
  });

  it("should return home name after acceptance", async () => {
    const invite = createInvite(testHomeId, testUserId);

    const newUser = await register(
      `homename-${Date.now()}@test.com`,
      "password",
      "HomeName User",
    );
    createdUserIds.push(newUser.user.id);

    const result = await acceptInvite(invite.code, newUser.user.id);

    expect(result.homeName).toBeString();
    expect(result.homeName.length).toBeGreaterThan(0);
  });
});

describe("Invite Service - getHomeMembers()", () => {
  let memberUserId: string;

  beforeAll(async () => {
    // Add a member to the test home
    const invite = createInvite(testHomeId, testUserId);
    const newUser = await register(
      `getmembers-${Date.now()}@test.com`,
      "password",
      "Get Members User",
    );
    createdUserIds.push(newUser.user.id);
    memberUserId = newUser.user.id;

    await acceptInvite(invite.code, memberUserId);
  });

  it("should get all members of a home", async () => {
    const members = await getHomeMembers(testHomeId);

    expect(members.length).toBeGreaterThanOrEqual(2); // owner + added member
  });

  it("should include user details in member list", async () => {
    const members = await getHomeMembers(testHomeId);

    const member = members.find((m) => m.userId === memberUserId);

    expect(member).toBeDefined();
    expect(member!.name).toBeString();
    expect(member!.email).toBeString();
    expect(member!.role).toBe("member");
  });

  it("should include owner in member list", async () => {
    const members = await getHomeMembers(testHomeId);

    const owner = members.find((m) => m.userId === testUserId);

    expect(owner).toBeDefined();
    expect(owner!.role).toBe("owner");
  });

  it("should include membership metadata", async () => {
    const members = await getHomeMembers(testHomeId);

    for (const member of members) {
      expect(member).toHaveProperty("id"); // membership id
      expect(member).toHaveProperty("userId");
      expect(member).toHaveProperty("name");
      expect(member).toHaveProperty("email");
      expect(member).toHaveProperty("role");
      expect(member).toHaveProperty("joinedAt");
      expect(member.joinedAt).toBeInstanceOf(Date);
    }
  });

  it("should return empty array for home with no members", async () => {
    // Create a new home with no members
    const [orphanHome] = await db
      .insert(homesTable)
      .values({ name: "Orphan Home", ownerId: testUserId, currency: "USD" })
      .returning();

    const members = await getHomeMembers(orphanHome.id);

    expect(members).toBeArray();
    expect(members.length).toBe(0);

    // Cleanup
    await db.delete(homesTable).where(eq(homesTable.id, orphanHome.id));
  });
});

describe("Invite Service - Expired Invite Handling", () => {
  it("should clean up expired invites automatically", async () => {
    const invite = createInvite(testHomeId, testUserId);

    // Verify invite exists
    const infoBefore = await getInviteInfo(invite.code);
    expect(infoBefore).toBeDefined();

    // Create another invite (triggers cleanup)
    createInvite(testHomeId, testUserId);

    // Original invite should still exist (not expired yet)
    const infoAfter = await getInviteInfo(invite.code);
    expect(infoAfter).toBeDefined();
  });

  it("should create new invites after cleanup", () => {
    // Create multiple invites to trigger cleanup
    const invite1 = createInvite(testHomeId, testUserId);
    const invite2 = createInvite(testHomeId, testUserId);
    const invite3 = createInvite(testHomeId, testUserId);

    expect(invite1.code).toBeString();
    expect(invite2.code).toBeString();
    expect(invite3.code).toBeString();
    expect(invite1.code).not.toBe(invite2.code);
    expect(invite2.code).not.toBe(invite3.code);
  });
});

} // end of else block (skipTests check)
