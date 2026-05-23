/**
 * Unit tests for the notifications service.
 */

import { describe, it, expect, beforeAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import { db, usersTable, homeMembersTable } from "@pantry-pixie/core";
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  hasUnreadOfType,
  notifyPartners,
} from "../notifications";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Tests require DATABASE_URL to be set", () => {});
} else {
  let homeId: string;
  let ownerId: string;

  beforeAll(async () => {
    const seed = await seedTestUser();
    homeId = seed.home.id;
    ownerId = seed.user.id;
  });

  describe("Notifications service", () => {
    it("creates and lists whole-home and targeted notifications", async () => {
      await createNotification({
        homeId,
        type: "recurring_due",
        title: "Restock milk",
        refId: "item-x",
      });
      await createNotification({
        homeId,
        userId: ownerId,
        type: "expiring_soon",
        title: "Spinach expires",
        refId: "item-y",
      });

      const list = await listNotifications(homeId, ownerId);
      const titles = list.map((n) => n.title);
      expect(titles).toContain("Restock milk"); // whole-home
      expect(titles).toContain("Spinach expires"); // targeted at owner
    });

    it("hides another member's targeted notifications", async () => {
      const list = await listNotifications(homeId, "some-other-user-id");
      expect(list.find((n) => n.title === "Spinach expires")).toBeUndefined();
      expect(list.find((n) => n.title === "Restock milk")).toBeDefined();
    });

    it("tracks unread-of-type and marks read", async () => {
      const n = await createNotification({
        homeId,
        type: "expiring_soon",
        title: "Eggs expire",
        refId: "item-eggs",
      });
      expect(await hasUnreadOfType(homeId, "expiring_soon", "item-eggs")).toBe(
        true,
      );
      await markNotificationRead(homeId, n.id);
      expect(await hasUnreadOfType(homeId, "expiring_soon", "item-eggs")).toBe(
        false,
      );
    });

    it("notifies partners but not the actor", async () => {
      const [partner] = await db
        .insert(usersTable)
        .values({
          email: `partner-${crypto.randomUUID()}@test.com`,
          name: "Partner",
          passwordHash: "x",
        })
        .returning();
      await db
        .insert(homeMembersTable)
        .values({ homeId, userId: partner.id, role: "member" });

      await notifyPartners(homeId, ownerId, {
        type: "partner_activity",
        title: "Owner added Bread",
        refId: "item-bread",
      });

      const partnerList = await listNotifications(homeId, partner.id);
      expect(
        partnerList.find((n) => n.title === "Owner added Bread"),
      ).toBeDefined();

      const ownerList = await listNotifications(homeId, ownerId);
      expect(
        ownerList.find((n) => n.title === "Owner added Bread"),
      ).toBeUndefined();
    });
  });
}
