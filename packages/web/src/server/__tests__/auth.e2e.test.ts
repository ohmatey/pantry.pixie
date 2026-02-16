import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { seedTestUser, TEST_EMAIL, TEST_PASSWORD } from "@pantry-pixie/core";
import {
  startServer,
  loginSeedUser,
  authedFetch,
  type TestServer,
} from "./helpers";

// Early exit if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  Skipping E2E tests - DATABASE_URL not set");
  process.exit(0);
}

let server: TestServer;

  beforeAll(async () => {
    await seedTestUser();
    server = startServer();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/login
  // ---------------------------------------------------------------------------

  describe("POST /api/auth/login", () => {
  it("returns 200 + token for valid seed user credentials", async () => {
    const res = await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeString();
    expect(body.data.user.email).toBe(TEST_EMAIL);
    expect(body.data.user.homeId).toBeString();
  });

  it("returns 401 for wrong password", async () => {
    const res = await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: "wrong-password" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 for non-existent email", async () => {
    const res = await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "nope" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  const uniqueEmail = () =>
    `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;

  it("returns 201 + token for a new user", async () => {
    const email = uniqueEmail();
    const res = await fetch(`${server.url}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "newpass123", name: "New User" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeString();
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.homeId).toBeString();
  });

  it("returns 409 for duplicate email", async () => {
    const res = await fetch(`${server.url}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: "dup123",
        name: "Dup",
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await fetch(`${server.url}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail() }),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

describe("GET /api/auth/me", () => {
  it("returns 200 + user data with valid token", async () => {
    const { token } = await loginSeedUser(server.url);
    const res = await authedFetch(server.url, "/api/auth/me", token);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(TEST_EMAIL);
    expect(body.data.userId).toBeString();
    expect(body.data.homeId).toBeString();
  });

  it("returns 401 without a token", async () => {
    const res = await fetch(`${server.url}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await authedFetch(
      server.url,
      "/api/auth/me",
      "bogus.jwt.token",
    );
    expect(res.status).toBe(401);
  });
});
