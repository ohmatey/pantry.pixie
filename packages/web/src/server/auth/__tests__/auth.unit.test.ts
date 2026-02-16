/**
 * Unit tests for auth service
 * Tests register, login, token verification, and auth middleware
 */

import { describe, it, expect, beforeAll, afterAll, test } from "bun:test";
import {
  register,
  login,
  verifyToken,
  authenticateRequest,
  withAuth,
} from "../index";
import {
  db,
  eq,
  usersTable,
  homesTable,
  homeMembersTable,
} from "@pantry-pixie/core";
import { seedTestUser, TEST_EMAIL, TEST_PASSWORD } from "@pantry-pixie/core";
import { shouldSkipDatabaseTests } from "../../__tests__/test-helpers";

// Skip all tests if DATABASE_URL is not set
const skipTests = shouldSkipDatabaseTests();

if (skipTests) {
  test.skip("Auth tests require DATABASE_URL to be set", () => {});
} else {
  // Clean up test users after tests
  async function cleanupTestUsers(emails: string[]) {
    for (const email of emails) {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email),
      });
      if (user) {
        // Delete homes owned by user
        await db.delete(homesTable).where(eq(homesTable.ownerId, user.id));
        // Delete user
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
      }
    }
  }

  describe("Auth Service - register()", () => {
    const testEmails: string[] = [];

    afterAll(async () => {
    await cleanupTestUsers(testEmails);
  });

  it("should register a new user with valid credentials", async () => {
    const email = `newuser-${Date.now()}@test.com`;
    testEmails.push(email);
    const result = await register(email, "securepass123", "New User");

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("user");
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("New User");
    expect(result.user.id).toBeString();
    expect(result.user.homeId).toBeString();
    expect(result.token).toBeString();
  });

  it("should hash password with Argon2id", async () => {
    const email = `hashtest-${Date.now()}@test.com`;
    testEmails.push(email);
    await register(email, "mypassword", "Hash Test");

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    expect(user).toBeDefined();
    expect(user!.passwordHash).toBeString();
    expect(user!.passwordHash).not.toBe("mypassword");
    expect(user!.passwordHash).toStartWith("$argon2id$");
  });

  it("should create a default home for new user", async () => {
    const email = `hometest-${Date.now()}@test.com`;
    testEmails.push(email);
    const result = await register(email, "password", "Home Test");

    const home = await db.query.homesTable.findFirst({
      where: eq(homesTable.id, result.user.homeId),
    });

    expect(home).toBeDefined();
    expect(home!.name).toBe("Home Test's Kitchen");
    expect(home!.ownerId).toBe(result.user.id);
  });

  it("should add user as owner of their home", async () => {
    const email = `ownertest-${Date.now()}@test.com`;
    testEmails.push(email);
    const result = await register(email, "password", "Owner Test");

    const membership = await db.query.homeMembersTable.findFirst({
      where: eq(homeMembersTable.homeId, result.user.homeId),
    });

    expect(membership).toBeDefined();
    expect(membership!.userId).toBe(result.user.id);
    expect(membership!.role).toBe("owner");
  });

  it("should create a welcome chat thread with Pixie's message", async () => {
    const email = `chattest-${Date.now()}@test.com`;
    testEmails.push(email);
    const result = await register(email, "password", "Chat Test");

    // Check that chat thread exists
    const { chatThreadsTable } = await import("@pantry-pixie/core");
    const threads = await db.query.chatThreadsTable.findMany({
      where: eq(chatThreadsTable.homeId, result.user.homeId),
    });

    expect(threads.length).toBeGreaterThanOrEqual(1);
    expect(threads[0].title).toBe("Chat");
  });

  it("should throw error for duplicate email", async () => {
    const email = `duplicate-${Date.now()}@test.com`;
    testEmails.push(email);
    await register(email, "password1", "First User");

    await expect(async () => {
      await register(email, "password2", "Second User");
    }).toThrow("Email already registered");
  });

  it("should generate valid JWT token", async () => {
    const email = `tokentest-${Date.now()}@test.com`;
    testEmails.push(email);
    const result = await register(email, "password", "Token Test");

    const payload = await verifyToken(result.token);

    expect(payload.userId).toBe(result.user.id);
    expect(payload.homeId).toBe(result.user.homeId);
    expect(payload.email).toBe(email);

    await cleanupTestUsers([email]);
  });
});

describe("Auth Service - login()", () => {
  beforeAll(async () => {
    await seedTestUser();
  });

  it("should login with correct credentials", async () => {
    const result = await login(TEST_EMAIL, TEST_PASSWORD);

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("user");
    expect(result.user.email).toBe(TEST_EMAIL);
    expect(result.token).toBeString();
  });

  it("should return valid JWT token on login", async () => {
    const result = await login(TEST_EMAIL, TEST_PASSWORD);
    const payload = await verifyToken(result.token);

    expect(payload.userId).toBe(result.user.id);
    expect(payload.homeId).toBe(result.user.homeId);
    expect(payload.email).toBe(TEST_EMAIL);
  });

  it("should throw error for non-existent email", async () => {
    await expect(async () => {
      await login("nonexistent@test.com", "password");
    }).toThrow("Invalid email or password");
  });

  it("should throw error for incorrect password", async () => {
    await expect(async () => {
      await login(TEST_EMAIL, "wrongpassword");
    }).toThrow("Invalid email or password");
  });

  it("should throw error when user has no home membership", async () => {
    // Create user without home
    const email = "nohome@test.com";
    const passwordHash = await Bun.password.hash("password", {
      algorithm: "argon2id",
    });
    await db.insert(usersTable).values({
      email,
      name: "No Home",
      passwordHash,
      isVerified: true,
    });

    await expect(async () => {
      await login(email, "password");
    }).toThrow("No home found for user");

    await cleanupTestUsers([email]);
  });
});

describe("Auth Service - verifyToken()", () => {
  let validToken: string;

  beforeAll(async () => {
    await seedTestUser();
    const result = await login(TEST_EMAIL, TEST_PASSWORD);
    validToken = result.token;
  });

  it("should verify valid token and return payload", async () => {
    const payload = await verifyToken(validToken);

    expect(payload).toHaveProperty("userId");
    expect(payload).toHaveProperty("homeId");
    expect(payload).toHaveProperty("email");
    expect(payload.email).toBe(TEST_EMAIL);
  });

  it("should throw error for invalid token", async () => {
    await expect(async () => {
      await verifyToken("invalid.token.here");
    }).toThrow();
  });

  it("should throw error for malformed token", async () => {
    await expect(async () => {
      await verifyToken("noteven.atoken");
    }).toThrow();
  });

  it("should throw error for expired token", async () => {
    // Create a token that's already expired
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-secret-change-me",
    );

    const expiredToken = await new SignJWT({
      userId: "test",
      homeId: "test",
      email: "test@test.com",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("0s") // Expired immediately
      .sign(secret);

    // Wait a tiny bit to ensure it's expired
    await new Promise((resolve) => setTimeout(resolve, 100));

    await expect(async () => {
      await verifyToken(expiredToken);
    }).toThrow();
  });
});

describe("Auth Service - authenticateRequest()", () => {
  let validToken: string;

  beforeAll(async () => {
    await seedTestUser();
    const result = await login(TEST_EMAIL, TEST_PASSWORD);
    validToken = result.token;
  });

  it("should authenticate request with valid Bearer token", async () => {
    const request = new Request("http://localhost/test", {
      headers: { Authorization: `Bearer ${validToken}` },
    });

    const payload = await authenticateRequest(request);

    expect(payload.email).toBe(TEST_EMAIL);
    expect(payload.userId).toBeString();
    expect(payload.homeId).toBeString();
  });

  it("should throw error when Authorization header is missing", async () => {
    const request = new Request("http://localhost/test");

    await expect(async () => {
      await authenticateRequest(request);
    }).toThrow("Missing or invalid Authorization header");
  });

  it("should throw error when Authorization header doesn't start with Bearer", async () => {
    const request = new Request("http://localhost/test", {
      headers: { Authorization: `Basic ${validToken}` },
    });

    await expect(async () => {
      await authenticateRequest(request);
    }).toThrow("Missing or invalid Authorization header");
  });

  it("should throw error for invalid token in header", async () => {
    const request = new Request("http://localhost/test", {
      headers: { Authorization: "Bearer invalid.token" },
    });

    await expect(async () => {
      await authenticateRequest(request);
    }).toThrow();
  });
});

describe("Auth Service - withAuth() middleware", () => {
  let validToken: string;

  beforeAll(async () => {
    await seedTestUser();
    const result = await login(TEST_EMAIL, TEST_PASSWORD);
    validToken = result.token;
  });

  it("should call handler with auth payload for valid token", async () => {
    let capturedAuth: any = null;

    const handler = async (
      req: Request,
      params: Record<string, string>,
      auth: any,
    ) => {
      capturedAuth = auth;
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    };

    const wrappedHandler = withAuth(handler);
    const request = new Request("http://localhost/test", {
      headers: { Authorization: `Bearer ${validToken}` },
    });

    const response = await wrappedHandler(request, {});

    expect(response.status).toBe(200);
    expect(capturedAuth).toBeDefined();
    expect(capturedAuth.email).toBe(TEST_EMAIL);
  });

  it("should return 401 for missing Authorization header", async () => {
    const handler = async () => {
      return new Response(JSON.stringify({ success: true }));
    };

    const wrappedHandler = withAuth(handler);
    const request = new Request("http://localhost/test");

    const response = await wrappedHandler(request, {});

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 401 for invalid token", async () => {
    const handler = async () => {
      return new Response(JSON.stringify({ success: true }));
    };

    const wrappedHandler = withAuth(handler);
    const request = new Request("http://localhost/test", {
      headers: { Authorization: "Bearer invalid.token" },
    });

    const response = await wrappedHandler(request, {});

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("should not call handler when authentication fails", async () => {
    let handlerCalled = false;

    const handler = async () => {
      handlerCalled = true;
      return new Response(JSON.stringify({ success: true }));
    };

    const wrappedHandler = withAuth(handler);
    const request = new Request("http://localhost/test");

    await wrappedHandler(request, {});

    expect(handlerCalled).toBe(false);
  });

  it("should pass through handler's response when authenticated", async () => {
    const handler = async () => {
      return new Response(JSON.stringify({ custom: "data", value: 42 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };

    const wrappedHandler = withAuth(handler);
    const request = new Request("http://localhost/test", {
      headers: { Authorization: `Bearer ${validToken}` },
    });

    const response = await wrappedHandler(request, {});

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.custom).toBe("data");
    expect(body.value).toBe(42);
  });
});

} // end of else block (skipTests check)
