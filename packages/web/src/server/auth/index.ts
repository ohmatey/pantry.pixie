/**
 * Authentication module — JWT-based auth with Argon2id password hashing
 */

import { SignJWT, jwtVerify } from "jose";
import {
  db,
  eq,
  usersTable,
  homesTable,
  homeMembersTable,
  chatThreadsTable,
  chatMessagesTable,
  getWelcomeMessage,
} from "@pantry-pixie/core";

// JWT_SECRET is validated in config/env.ts (required, min 32 chars)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_EXPIRY = "7d";

export interface AuthPayload {
  userId: string;
  homeId: string;
  email: string;
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<{
  token: string;
  user: { id: string; email: string; name: string; homeId: string };
}> {
  // Check if user already exists
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await Bun.password.hash(password, {
    algorithm: "argon2id",
  });

  const [user] = await db
    .insert(usersTable)
    .values({ email, name, passwordHash, isVerified: true })
    .returning();

  // Create default home
  const [home] = await db
    .insert(homesTable)
    .values({
      name: `${name}'s Kitchen`,
      ownerId: user.id,
      currency: "USD",
    })
    .returning();

  // Add as owner
  await db.insert(homeMembersTable).values({
    homeId: home.id,
    userId: user.id,
    role: "owner",
  });

  // Create welcome chat thread with Pixie's first message
  const [thread] = await db
    .insert(chatThreadsTable)
    .values({ homeId: home.id, title: "Chat" })
    .returning();

  await db.insert(chatMessagesTable).values({
    threadId: thread.id,
    role: "assistant",
    content: getWelcomeMessage(name),
    intent: "greeting",
  });

  const token = await createToken({
    userId: user.id,
    homeId: home.id,
    email: user.email,
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, homeId: home.id },
  };
}

export async function login(
  email: string,
  password: string,
): Promise<{
  token: string;
  user: { id: string; email: string; name: string; homeId: string };
}> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  // Get user's home (first owned home)
  const membership = await db.query.homeMembersTable.findFirst({
    where: eq(homeMembersTable.userId, user.id),
  });

  if (!membership) {
    throw new Error("No home found for user");
  }

  const token = await createToken({
    userId: user.id,
    homeId: membership.homeId,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      homeId: membership.homeId,
    },
  };
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthPayload> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    userId: payload.userId as string,
    homeId: payload.homeId as string,
    email: payload.email as string,
  };
}

async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Wrapper for protected route handlers
 */
export function withAuth(
  handler: (
    request: Request,
    params: Record<string, string>,
    auth: AuthPayload,
  ) => Response | Promise<Response>,
) {
  return async (
    request: Request,
    params: Record<string, string>,
  ): Promise<Response> => {
    try {
      const auth = await authenticateRequest(request);
      return handler(request, params, auth);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
  };
}
