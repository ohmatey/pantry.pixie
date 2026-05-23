/**
 * API route handlers for Pantry Pixie web server
 */

import {
  register,
  login,
  withAuth,
  assertHomeMembership,
  type AuthPayload,
} from "../auth";
import * as chatService from "../services/chat";
import * as itemsService from "../services/items";
import * as groceryListsService from "../services/grocery-lists";
import * as budgetService from "../services/budget";
import * as notificationsService from "../services/notifications";
import {
  db,
  eq,
  desc,
  homesTable,
  homeMembersTable,
  usersTable,
  chatThreadsTable,
  chatMessagesTable,
  itemUsageHistoryTable,
} from "@pantry-pixie/core";
import {
  createInvite,
  acceptInvite,
  getHomeMembers,
} from "../services/invites";
import {
  validateBody,
  registerSchema,
  loginSchema,
  createHomeSchema,
  updateHomeSchema,
  createItemSchema,
  updateItemSchema,
  createGroceryListSchema,
  updateGroceryListSchema,
  addListItemSchema,
  addListItemByNameSchema,
  createThreadSchema,
  sendMessageSchema,
} from "./validation";
import { type AppError } from "../middleware/error-handler";
import { logger } from "../lib/logger";

export interface RouteHandler {
  (
    request: Request,
    params: Record<string, string>,
  ): Response | Promise<Response>;
}

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: RouteHandler;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Sanitize errors before returning to client.
 * AppErrors (with explicit status) expose their message for 4xx responses.
 * All other errors are logged server-side and return a generic message.
 */
function handleError(err: unknown): Response {
  const appErr = err as AppError;
  if (appErr?.status !== undefined) {
    const status = appErr.status;
    if (status >= 400 && status < 500) {
      return json({ success: false, error: appErr.message, code: appErr.code }, status);
    }
  }
  logger.error({ err }, "Unexpected error in API handler");
  return json({ success: false, error: "An unexpected error occurred" }, 500);
}

/**
 * Register API routes
 */
export function registerApiRoutes(): Route[] {
  return [
    // Auth routes (public)
    { method: "POST", path: "/api/auth/register", handler: handleRegister },
    { method: "POST", path: "/api/auth/login", handler: handleLogin },
    { method: "GET", path: "/api/auth/me", handler: withAuth(handleGetMe) },

    // User preference routes
    { method: "GET", path: "/api/users/me/preferences", handler: withAuth(handleGetPreferences) },
    { method: "PATCH", path: "/api/users/me/preferences", handler: withAuth(handleUpdatePreferences) },

    // Home routes
    { method: "GET", path: "/api/homes", handler: withAuth(handleListHomes) },
    { method: "GET", path: "/api/homes/:id", handler: withAuth(handleGetHome) },
    { method: "POST", path: "/api/homes", handler: withAuth(handleCreateHome) },
    {
      method: "PUT",
      path: "/api/homes/:id",
      handler: withAuth(handleUpdateHome),
    },

    // Home members
    {
      method: "GET",
      path: "/api/homes/:homeId/members",
      handler: withAuth(handleListMembers),
    },

    // Invite routes
    {
      method: "POST",
      path: "/api/homes/:homeId/invites",
      handler: withAuth(handleCreateInvite),
    },
    {
      method: "POST",
      path: "/api/invites/:code/accept",
      handler: withAuth(handleAcceptInvite),
    },
    { method: "GET", path: "/api/invites/:code", handler: handleGetInviteInfo },

    // Item routes
    {
      method: "GET",
      path: "/api/homes/:homeId/items",
      handler: withAuth(handleListItems),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/items/stats",
      handler: withAuth(handleGetItemStats),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/items/:id",
      handler: withAuth(handleGetItem),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/items",
      handler: withAuth(handleCreateItem),
    },
    {
      method: "PUT",
      path: "/api/homes/:homeId/items/:id",
      handler: withAuth(handleUpdateItem),
    },
    {
      method: "PATCH",
      path: "/api/homes/:homeId/items/:id/toggle",
      handler: withAuth(handleToggleItem),
    },
    {
      method: "DELETE",
      path: "/api/homes/:homeId/items/:id",
      handler: withAuth(handleDeleteItem),
    },

    // Grocery list routes
    {
      method: "GET",
      path: "/api/homes/:homeId/lists",
      handler: withAuth(handleListGroceryLists),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/lists/default",
      handler: withAuth(handleGetDefaultList),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/lists/:id/stats",
      handler: withAuth(handleGetListStats),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/lists/:id",
      handler: withAuth(handleGetGroceryList),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/lists",
      handler: withAuth(handleCreateGroceryList),
    },
    {
      method: "PUT",
      path: "/api/homes/:homeId/lists/:id",
      handler: withAuth(handleUpdateGroceryList),
    },
    {
      method: "DELETE",
      path: "/api/homes/:homeId/lists/:id",
      handler: withAuth(handleDeleteGroceryList),
    },
    {
      method: "PATCH",
      path: "/api/homes/:homeId/lists/:id/complete",
      handler: withAuth(handleCompleteGroceryList),
    },
    {
      method: "PATCH",
      path: "/api/homes/:homeId/lists/:id/reset",
      handler: withAuth(handleResetGroceryList),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/lists/:listId/items",
      handler: withAuth(handleAddListItem),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/lists/:listId/items/by-name",
      handler: withAuth(handleAddListItemByName),
    },
    {
      method: "DELETE",
      path: "/api/homes/:homeId/lists/:listId/items/:listItemId",
      handler: withAuth(handleRemoveListItem),
    },
    {
      method: "PATCH",
      path: "/api/homes/:homeId/lists/:listId/items/:listItemId/toggle",
      handler: withAuth(handleToggleListItem),
    },

    // Chat routes
    {
      method: "GET",
      path: "/api/homes/:homeId/chat/threads",
      handler: withAuth(handleListChatThreads),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/chat/threads",
      handler: withAuth(handleCreateChatThread),
    },
    {
      method: "GET",
      path: "/api/homes/:homeId/chat/threads/:threadId/messages",
      handler: withAuth(handleGetMessages),
    },
    {
      method: "POST",
      path: "/api/homes/:homeId/chat/threads/:threadId/messages",
      handler: withAuth(handleSendMessage),
    },

    // Budget routes
    {
      method: "GET",
      path: "/api/homes/:homeId/budget",
      handler: withAuth(handleGetBudget),
    },

    // Activity routes
    {
      method: "GET",
      path: "/api/homes/:homeId/activity",
      handler: withAuth(handleGetActivity),
    },

    // Notification routes
    {
      method: "GET",
      path: "/api/homes/:homeId/notifications",
      handler: withAuth(handleGetNotifications),
    },
    {
      method: "PATCH",
      path: "/api/homes/:homeId/notifications/:id/read",
      handler: withAuth(handleMarkNotificationRead),
    },
  ];
}

// ============================================================================
// Auth handlers
// ============================================================================

async function handleRegister(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(registerSchema, body);
    if (!parsed.success) return parsed.response;

    const { email, password, name } = parsed.data;
    const result = await register(email, password, name);
    return json({ success: true, data: result, timestamp: new Date() }, 201);
  } catch (err) {
    const appErr = err as AppError;
    if (appErr?.message === "Email already registered") {
      return json({ success: false, error: appErr.message }, 409);
    }
    return handleError(err);
  }
}

async function handleLogin(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(loginSchema, body);
    if (!parsed.success) return parsed.response;

    const { email, password } = parsed.data;
    const result = await login(email, password);
    return json({ success: true, data: result, timestamp: new Date() });
  } catch (err) {
    return json({ success: false, error: "Invalid email or password" }, 401);
  }
}

async function handleGetMe(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  return json({
    success: true,
    data: { userId: auth.userId, homeId: auth.homeId, email: auth.email },
    timestamp: new Date(),
  });
}

// ============================================================================
// Home handlers
// ============================================================================

async function handleListHomes(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    const memberships = await db.query.homeMembersTable.findMany({
      where: eq(homeMembersTable.userId, auth.userId),
    });

    const homes = [];
    for (const m of memberships) {
      const home = await db.query.homesTable.findFirst({
        where: eq(homesTable.id, m.homeId),
      });
      if (home) {
        const memberCount = await db.query.homeMembersTable.findMany({
          where: eq(homeMembersTable.homeId, home.id),
        });
        homes.push({ ...home, memberCount: memberCount.length, role: m.role });
      }
    }

    return json({ success: true, data: homes, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetHome(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.id, auth.userId);

    const home = await db.query.homesTable.findFirst({
      where: eq(homesTable.id, params.id),
    });

    if (!home) {
      return json({ success: false, error: "Home not found" }, 404);
    }

    return json({ success: true, data: home, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleCreateHome(
  request: Request,
  _params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(createHomeSchema, body);
    if (!parsed.success) return parsed.response;
    const { name } = parsed.data;

    const [home] = await db
      .insert(homesTable)
      .values({ name, ownerId: auth.userId })
      .returning();

    await db.insert(homeMembersTable).values({
      homeId: home.id,
      userId: auth.userId,
      role: "owner",
    });

    return json({ success: true, data: home, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleUpdateHome(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.id, auth.userId, "admin");

    const body = await request.json();
    const parsed = validateBody(updateHomeSchema, body);
    if (!parsed.success) return parsed.response;
    const { name } = parsed.data;

    const [home] = await db
      .update(homesTable)
      .set({ name, updatedAt: new Date() })
      .where(eq(homesTable.id, params.id))
      .returning();

    if (!home) {
      return json({ success: false, error: "Home not found" }, 404);
    }

    return json({ success: true, data: home, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Members handlers
// ============================================================================

async function handleListMembers(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const members = await getHomeMembers(params.homeId);
    return json({ success: true, data: members, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Invite handlers
// ============================================================================

async function handleCreateInvite(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId, "admin");
    const invite = createInvite(params.homeId, auth.userId);
    return json({ success: true, data: invite, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleAcceptInvite(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    const result = await acceptInvite(params.code, auth.userId);
    return json({ success: true, data: result, timestamp: new Date() });
  } catch (err) {
    const appErr = err as AppError;
    if (appErr?.status !== undefined && appErr.status >= 400 && appErr.status < 500) {
      return json({ success: false, error: appErr.message }, appErr.status);
    }
    return json({ success: false, error: "Invalid or expired invite" }, 400);
  }
}

async function handleGetInviteInfo(
  _request: Request,
  params: Record<string, string>,
): Promise<Response> {
  try {
    const { getInviteInfo } = await import("../services/invites");
    const info = await getInviteInfo(params.code);
    if (!info) {
      return json({ success: false, error: "Invalid or expired invite" }, 404);
    }
    return json({ success: true, data: info, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Item handlers
// ============================================================================

async function handleListItems(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const items = await itemsService.listItems(params.homeId, {
      category,
      search,
    });
    return json({ success: true, data: items, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetItem(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const item = await itemsService.getItem(params.homeId, params.id);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleCreateItem(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(createItemSchema, body);
    if (!parsed.success) return parsed.response;
    const item = await itemsService.addItem(params.homeId, parsed.data, auth.userId);
    return json({ success: true, data: item, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleUpdateItem(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(updateItemSchema, body);
    if (!parsed.success) return parsed.response;
    const item = await itemsService.updateItem(
      params.homeId,
      params.id,
      parsed.data,
    );
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleToggleItem(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const item = await itemsService.toggleItemCheck(params.homeId, params.id, auth.userId);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleDeleteItem(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const item = await itemsService.removeItem(params.homeId, params.id, auth.userId);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetItemStats(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const stats = await itemsService.getStats(params.homeId);
    return json({ success: true, data: stats, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Grocery list handlers
// ============================================================================

async function handleListGroceryLists(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const lists = await groceryListsService.getLists(params.homeId);
    return json({ success: true, data: lists, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetGroceryList(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const list = await groceryListsService.getList(params.homeId, params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleCreateGroceryList(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(createGroceryListSchema, body);
    if (!parsed.success) return parsed.response;

    const list = await groceryListsService.createList(
      params.homeId,
      parsed.data,
    );
    return json({ success: true, data: list, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleUpdateGroceryList(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(updateGroceryListSchema, body);
    if (!parsed.success) return parsed.response;
    const list = await groceryListsService.updateList(
      params.homeId,
      params.id,
      parsed.data,
    );
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleDeleteGroceryList(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId, "admin");
    const list = await groceryListsService.deleteList(params.homeId, params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleCompleteGroceryList(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const list = await groceryListsService.completeList(
      params.homeId,
      params.id,
    );
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetDefaultList(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const list = await groceryListsService.getOrCreateDefaultList(
      params.homeId,
    );
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleResetGroceryList(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId, "admin");
    const list = await groceryListsService.resetScheduledList(params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleAddListItemByName(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(addListItemByNameSchema, body);
    if (!parsed.success) return parsed.response;

    const { name, quantity } = parsed.data;

    const item = await groceryListsService.findOrCreateItem(
      params.homeId,
      name,
    );

    const listItem = await groceryListsService.addListItem(
      params.homeId,
      params.listId,
      {
        itemId: item.id,
        quantity: quantity ?? 1,
      },
    );

    if (!listItem) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json(
      { success: true, data: { listItem, item }, timestamp: new Date() },
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetListStats(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const stats = await groceryListsService.getListStats(
      params.homeId,
      params.id,
    );
    if (!stats) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: stats, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleAddListItem(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(addListItemSchema, body);
    if (!parsed.success) return parsed.response;

    const listItem = await groceryListsService.addListItem(
      params.homeId,
      params.listId,
      parsed.data,
    );
    if (!listItem) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: listItem, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleRemoveListItem(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const listItem = await groceryListsService.removeListItem(
      params.homeId,
      params.listId,
      params.listItemId,
    );
    if (!listItem) {
      return json({ success: false, error: "List item not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleToggleListItem(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const listItem = await groceryListsService.toggleListItem(
      params.homeId,
      params.listId,
      params.listItemId,
    );
    if (!listItem) {
      return json({ success: false, error: "List item not found" }, 404);
    }
    return json({ success: true, data: listItem, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Chat handlers
// ============================================================================

async function handleListChatThreads(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const threads = await chatService.getThreads(params.homeId);
    return json({ success: true, data: threads, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleCreateChatThread(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json().catch(() => ({}));
    const parsed = validateBody(createThreadSchema, body);
    if (!parsed.success) return parsed.response;
    const thread = await chatService.createThread(
      params.homeId,
      parsed.data.title,
    );
    return json({ success: true, data: thread, timestamp: new Date() }, 201);
  } catch (err) {
    return handleError(err);
  }
}

async function handleGetMessages(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const url = new URL(request.url);
    const rawLimit = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);
    const messages = await chatService.getMessages(params.threadId, limit);
    return json({ success: true, data: messages, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleSendMessage(
  request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const body = await request.json();
    const parsed = validateBody(sendMessageSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await chatService.sendMessage(
      params.threadId,
      params.homeId,
      auth.userId,
      parsed.data.content,
    );

    // HTTP endpoint awaits the full response (streaming is for WebSocket path)
    let assistantText = "";
    await result.streamHandler(
      () => {},
      (fullText) => { assistantText = fullText; },
    );

    return json(
      {
        success: true,
        data: { userMessage: result.userMessage, assistantText },
        timestamp: new Date(),
      },
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// User preference handlers
// ============================================================================

/**
 * Resolve which home a user's shared preferences (household size, house dietary
 * rules) belong to. Prefers the caller's ACTIVE home when supplied (verified by
 * membership) — a partner may belong to both their own auto-created home and
 * the shared one they joined, so we can't infer it from ownership or join time
 * (join timestamps are second-precision and can tie). Falls back to the most
 * recent membership. Returns null if the user has no home.
 */
async function resolveHomeId(
  userId: string,
  requested?: string | null,
): Promise<string | null> {
  const memberships = await db.query.homeMembersTable.findMany({
    where: eq(homeMembersTable.userId, userId),
  });
  if (requested && memberships.some((m) => m.homeId === requested)) {
    return requested;
  }
  if (memberships.length === 0) return null;
  memberships.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
  return memberships[0].homeId;
}

async function handleGetPreferences(
  request: Request,
  _params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, auth.userId),
    });
    if (!user) {
      return json({ success: false, error: "User not found" }, 404);
    }
    // Shared (home-level) fields resolve against the caller's active home.
    const requestedHome = new URL(request.url).searchParams.get("homeId");
    const homeId = await resolveHomeId(auth.userId, requestedHome);
    const home = homeId
      ? await db.query.homesTable.findFirst({ where: eq(homesTable.id, homeId) })
      : null;
    return json({
      success: true,
      data: {
        dietaryRestrictions: user.dietaryRestrictions
          ? JSON.parse(user.dietaryRestrictions)
          : [],
        cookingSkillLevel: user.cookingSkillLevel || null,
        budgetConsciousness: user.budgetConsciousness || null,
        householdSize: home?.householdSize ?? null,
        sharedDietaryRestrictions: home?.sharedDietaryRestrictions
          ? JSON.parse(home.sharedDietaryRestrictions)
          : [],
      },
      timestamp: new Date(),
    });
  } catch (err) {
    return handleError(err);
  }
}

async function handleUpdatePreferences(
  request: Request,
  _params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    const body = await request.json();
    const updates: Record<string, string | number | null> = {};

    if ("dietaryRestrictions" in body) {
      updates.dietaryRestrictions = Array.isArray(body.dietaryRestrictions)
        ? JSON.stringify(body.dietaryRestrictions)
        : null;
    }
    if ("cookingSkillLevel" in body) {
      const valid = ["beginner", "intermediate", "advanced"];
      updates.cookingSkillLevel = valid.includes(body.cookingSkillLevel)
        ? body.cookingSkillLevel
        : null;
    }
    if ("budgetConsciousness" in body) {
      const valid = ["low", "medium", "high"];
      updates.budgetConsciousness = valid.includes(body.budgetConsciousness)
        ? body.budgetConsciousness
        : null;
    }
    // Home-level (shared) fields — household size and house dietary rules.
    const homeUpdates: Record<string, string | number | null> = {};
    if ("householdSize" in body) {
      const size = Number(body.householdSize);
      homeUpdates.householdSize =
        !isNaN(size) && size >= 1 && size <= 20 ? size : null;
    }
    if ("sharedDietaryRestrictions" in body) {
      homeUpdates.sharedDietaryRestrictions = Array.isArray(
        body.sharedDietaryRestrictions,
      )
        ? JSON.stringify(body.sharedDietaryRestrictions)
        : null;
    }

    if (
      Object.keys(updates).length === 0 &&
      Object.keys(homeUpdates).length === 0
    ) {
      return json({ success: false, error: "No valid fields to update" }, 400);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, auth.userId));
    }

    if (Object.keys(homeUpdates).length > 0) {
      const homeId = await resolveHomeId(
        auth.userId,
        typeof body.homeId === "string" ? body.homeId : null,
      );
      if (homeId) {
        await db
          .update(homesTable)
          .set(homeUpdates)
          .where(eq(homesTable.id, homeId));
      }
    }

    return json({ success: true, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Budget handlers
// ============================================================================

async function handleGetBudget(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const budgetSummary = await budgetService.getBudgetSummary(params.homeId);
    return json({ success: true, data: budgetSummary, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Activity handlers
// ============================================================================

async function handleGetActivity(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);

    // Get recent chat threads
    const threads = await db.query.chatThreadsTable.findMany({
      where: eq(chatThreadsTable.homeId, params.homeId),
      orderBy: [desc(chatThreadsTable.updatedAt)],
      limit: 30,
    });

    // Build activity events from threads
    const activities = await Promise.all(
      threads.map(async (thread) => {
        // Get first user message to find creator + get last user message for "continued" events
        const messages = await db.query.chatMessagesTable.findMany({
          where: eq(chatMessagesTable.threadId, thread.id),
          orderBy: [desc(chatMessagesTable.createdAt)],
          limit: 20,
        });

        const userMessages = messages.filter((m) => m.role === "user");
        const firstMsg = userMessages[userMessages.length - 1]; // oldest
        const lastMsg = userMessages[0]; // newest

        // Resolve actor: prefer the first-class userId column, fall back to
        // legacy metadata for messages written before the column existed.
        const getActorName = async (msg: typeof firstMsg | undefined) => {
          if (!msg) return null;
          const meta = msg.metadata as Record<string, unknown> | null;
          const userId =
            msg.userId ?? (meta?.userId as string | undefined) ?? null;
          if (!userId) return null;
          const user = await db.query.usersTable.findFirst({
            where: eq(usersTable.id, userId),
          });
          return user?.name || null;
        };

        const events = [];

        // Thread created event
        if (firstMsg) {
          const actorName = await getActorName(firstMsg);
          events.push({
            type: "chat_started" as const,
            threadId: thread.id,
            threadTitle: thread.title,
            actorName,
            timestamp: thread.createdAt,
          });
        }

        // Thread continued event (if last message is different from first)
        if (lastMsg && firstMsg && lastMsg.id !== firstMsg.id) {
          const actorName = await getActorName(lastMsg);
          events.push({
            type: "chat_continued" as const,
            threadId: thread.id,
            threadTitle: thread.title,
            actorName,
            timestamp: lastMsg.createdAt,
          });
        }

        return events;
      }),
    );

    // Item activity from the durable usage log (who added / used / checked what).
    const history = await db.query.itemUsageHistoryTable.findMany({
      where: eq(itemUsageHistoryTable.homeId, params.homeId),
      orderBy: [desc(itemUsageHistoryTable.createdAt)],
      limit: 40,
    });

    // Resolve actor names for item events from home membership.
    const itemActorIds = [
      ...new Set(
        history.map((h) => h.markedBy).filter((id): id is string => !!id),
      ),
    ];
    const itemActors = new Map<string, string>();
    for (const id of itemActorIds) {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, id),
      });
      if (user) itemActors.set(id, user.name);
    }

    const itemActivities = history.map((h) => ({
      type: `item_${h.action}` as `item_${string}`,
      itemId: h.itemId,
      itemName: h.itemName,
      actorName: (h.markedBy && itemActors.get(h.markedBy)) || null,
      timestamp: h.createdAt,
    }));

    // Flatten and sort by timestamp desc
    const allActivities = [
      ...activities.flat(),
      ...itemActivities,
    ].sort((a, b) => {
      const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return tb - ta;
    }).slice(0, 50);

    return json({ success: true, data: allActivities, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

// ============================================================================
// Notification handlers
// ============================================================================

async function handleGetNotifications(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const notifications = await notificationsService.listNotifications(
      params.homeId,
      auth.userId,
    );
    return json({ success: true, data: notifications, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}

async function handleMarkNotificationRead(
  _request: Request,
  params: Record<string, string>,
  auth: AuthPayload,
): Promise<Response> {
  try {
    await assertHomeMembership(params.homeId, auth.userId);
    const notification = await notificationsService.markNotificationRead(
      params.homeId,
      params.id,
    );
    if (!notification) {
      return json({ success: false, error: "Notification not found" }, 404);
    }
    return json({ success: true, data: notification, timestamp: new Date() });
  } catch (err) {
    return handleError(err);
  }
}
