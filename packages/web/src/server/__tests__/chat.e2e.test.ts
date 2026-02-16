import { describe, it, expect, beforeAll, afterAll, test } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import {
  startServer,
  loginSeedUser,
  authedFetch,
  type TestServer,
} from "./helpers";
import { shouldSkipDatabaseTests } from "./test-helpers";

// Skip all tests if DATABASE_URL is not set
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("E2E tests require DATABASE_URL to be set", () => {});
} else {
  let server: TestServer;
  let token: string;
  let homeId: string;
  let existingThreadId: string;

  beforeAll(async () => {
    const seed = await seedTestUser();
    server = startServer();
    const login = await loginSeedUser(server.url);
    token = login.token;
    homeId = login.user.homeId;
    existingThreadId = seed.thread.id;
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/homes/:homeId/chat/threads
  // ---------------------------------------------------------------------------

  describe("GET /api/homes/:homeId/chat/threads", () => {
  it("returns the seed thread", async () => {
    const res = await authedFetch(
      server.url,
      `/api/homes/${homeId}/chat/threads`,
      token,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const thread = body.data.find((t: any) => t.id === existingThreadId);
    expect(thread).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const res = await fetch(`${server.url}/api/homes/${homeId}/chat/threads`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/homes/:homeId/chat/threads
// ---------------------------------------------------------------------------

describe("POST /api/homes/:homeId/chat/threads", () => {
  it("creates a new thread with a title", async () => {
    const res = await authedFetch(
      server.url,
      `/api/homes/${homeId}/chat/threads`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ title: "Grocery Planning" }),
      },
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeString();
    expect(body.data.title).toBe("Grocery Planning");
    expect(body.data.homeId).toBe(homeId);
  });

  it("creates a thread with default title when none provided", async () => {
    const res = await authedFetch(
      server.url,
      `/api/homes/${homeId}/chat/threads`,
      token,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe("New Chat");
  });
});

// ---------------------------------------------------------------------------
// GET /api/homes/:homeId/chat/threads/:threadId/messages
// ---------------------------------------------------------------------------

describe("GET /api/homes/:homeId/chat/threads/:threadId/messages", () => {
  it("returns an empty list for a fresh thread", async () => {
    const res = await authedFetch(
      server.url,
      `/api/homes/${homeId}/chat/threads/${existingThreadId}/messages`,
      token,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await fetch(
      `${server.url}/api/homes/${homeId}/chat/threads/${existingThreadId}/messages`,
    );
    expect(res.status).toBe(401);
  });
});

} // end of else block (skipTests check)
