/**
 * API route handlers for Pantry Pixie web server
 */

import { register, login, authenticateRequest, withAuth, type AuthPayload } from "../auth";
import * as chatService from "../services/chat";
import * as itemsService from "../services/items";
import * as groceryListsService from "../services/grocery-lists";
import * as budgetService from "../services/budget";
import { db, eq, homesTable, homeMembersTable, usersTable } from "@pantry-pixie/core";
import { createInvite, acceptInvite, getHomeMembers } from "../services/invites";
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

export interface RouteHandler {
  (request: Request, params: Record<string, string>): Response | Promise<Response>;
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
 * Register API routes
 */
export function registerApiRoutes(): Route[] {
  return [
    // Auth routes (public)
    { method: "POST", path: "/api/auth/register", handler: handleRegister },
    { method: "POST", path: "/api/auth/login", handler: handleLogin },
    { method: "GET", path: "/api/auth/me", handler: withAuth(handleGetMe) },

    // Home routes
    { method: "GET", path: "/api/homes", handler: withAuth(handleListHomes) },
    { method: "GET", path: "/api/homes/:id", handler: withAuth(handleGetHome) },
    { method: "POST", path: "/api/homes", handler: withAuth(handleCreateHome) },
    { method: "PUT", path: "/api/homes/:id", handler: withAuth(handleUpdateHome) },

    // Home members
    { method: "GET", path: "/api/homes/:homeId/members", handler: withAuth(handleListMembers) },

    // Invite routes
    { method: "POST", path: "/api/homes/:homeId/invites", handler: withAuth(handleCreateInvite) },
    { method: "POST", path: "/api/invites/:code/accept", handler: withAuth(handleAcceptInvite) },
    { method: "GET", path: "/api/invites/:code", handler: handleGetInviteInfo },

    // Item routes
    { method: "GET", path: "/api/homes/:homeId/items", handler: withAuth(handleListItems) },
    { method: "GET", path: "/api/homes/:homeId/items/stats", handler: withAuth(handleGetItemStats) },
    { method: "GET", path: "/api/homes/:homeId/items/:id", handler: withAuth(handleGetItem) },
    { method: "POST", path: "/api/homes/:homeId/items", handler: withAuth(handleCreateItem) },
    { method: "PUT", path: "/api/homes/:homeId/items/:id", handler: withAuth(handleUpdateItem) },
    { method: "PATCH", path: "/api/homes/:homeId/items/:id/toggle", handler: withAuth(handleToggleItem) },
    { method: "DELETE", path: "/api/homes/:homeId/items/:id", handler: withAuth(handleDeleteItem) },

    // Grocery list routes
    { method: "GET", path: "/api/homes/:homeId/lists", handler: withAuth(handleListGroceryLists) },
    { method: "GET", path: "/api/homes/:homeId/lists/default", handler: withAuth(handleGetDefaultList) },
    { method: "GET", path: "/api/homes/:homeId/lists/:id/stats", handler: withAuth(handleGetListStats) },
    { method: "GET", path: "/api/homes/:homeId/lists/:id", handler: withAuth(handleGetGroceryList) },
    { method: "POST", path: "/api/homes/:homeId/lists", handler: withAuth(handleCreateGroceryList) },
    { method: "PUT", path: "/api/homes/:homeId/lists/:id", handler: withAuth(handleUpdateGroceryList) },
    { method: "DELETE", path: "/api/homes/:homeId/lists/:id", handler: withAuth(handleDeleteGroceryList) },
    { method: "PATCH", path: "/api/homes/:homeId/lists/:id/complete", handler: withAuth(handleCompleteGroceryList) },
    { method: "PATCH", path: "/api/homes/:homeId/lists/:id/reset", handler: withAuth(handleResetGroceryList) },
    { method: "POST", path: "/api/homes/:homeId/lists/:listId/items", handler: withAuth(handleAddListItem) },
    { method: "POST", path: "/api/homes/:homeId/lists/:listId/items/by-name", handler: withAuth(handleAddListItemByName) },
    { method: "DELETE", path: "/api/homes/:homeId/lists/:listId/items/:listItemId", handler: withAuth(handleRemoveListItem) },
    { method: "PATCH", path: "/api/homes/:homeId/lists/:listId/items/:listItemId/toggle", handler: withAuth(handleToggleListItem) },

    // Chat routes
    { method: "GET", path: "/api/homes/:homeId/chat/threads", handler: withAuth(handleListChatThreads) },
    { method: "POST", path: "/api/homes/:homeId/chat/threads", handler: withAuth(handleCreateChatThread) },
    { method: "GET", path: "/api/homes/:homeId/chat/threads/:threadId/messages", handler: withAuth(handleGetMessages) },
    {
      method: "POST",
      path: "/api/homes/:homeId/chat/threads/:threadId/messages",
      handler: withAuth(handleSendMessage),
    },

    // Budget routes
    { method: "GET", path: "/api/homes/:homeId/budget", handler: withAuth(handleGetBudget) },
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
  } catch (err: any) {
    const status = err.message === "Email already registered" ? 409 : 500;
    return json({ success: false, error: err.message }, status);
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
  } catch (err: any) {
    return json({ success: false, error: err.message }, 401);
  }
}

async function handleGetMe(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  return json({
    success: true,
    data: { userId: auth.userId, homeId: auth.homeId, email: auth.email },
    timestamp: new Date(),
  });
}

// ============================================================================
// Home handlers
// ============================================================================

async function handleListHomes(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
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
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetHome(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const home = await db.query.homesTable.findFirst({
      where: eq(homesTable.id, params.id),
    });

    if (!home) {
      return json({ success: false, error: "Home not found" }, 404);
    }

    return json({ success: true, data: home, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleCreateHome(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
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
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleUpdateHome(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
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
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Members handlers
// ============================================================================

async function handleListMembers(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const members = await getHomeMembers(params.homeId);
    return json({ success: true, data: members, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Invite handlers
// ============================================================================

async function handleCreateInvite(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const invite = createInvite(params.homeId, auth.userId);
    return json({ success: true, data: invite, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleAcceptInvite(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const result = await acceptInvite(params.code, auth.userId);
    return json({ success: true, data: result, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 400);
  }
}

async function handleGetInviteInfo(request: Request, params: Record<string, string>): Promise<Response> {
  try {
    // Import the invite store to look up the code
    const { getInviteInfo } = await import("../services/invites");
    const info = await getInviteInfo(params.code);
    if (!info) {
      return json({ success: false, error: "Invalid or expired invite" }, 404);
    }
    return json({ success: true, data: info, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Item handlers
// ============================================================================

async function handleListItems(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const items = await itemsService.listItems(params.homeId, { category, search });
    return json({ success: true, data: items, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const item = await itemsService.getItem(params.homeId, params.id);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleCreateItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(createItemSchema, body);
    if (!parsed.success) return parsed.response;
    const item = await itemsService.addItem(params.homeId, parsed.data);
    return json({ success: true, data: item, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleUpdateItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(updateItemSchema, body);
    if (!parsed.success) return parsed.response;
    const item = await itemsService.updateItem(params.homeId, params.id, parsed.data);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleToggleItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const item = await itemsService.toggleItemCheck(params.homeId, params.id);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, data: item, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleDeleteItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const item = await itemsService.removeItem(params.homeId, params.id);
    if (!item) {
      return json({ success: false, error: "Item not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetItemStats(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const stats = await itemsService.getStats(params.homeId);
    return json({ success: true, data: stats, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Grocery list handlers
// ============================================================================

async function handleListGroceryLists(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const lists = await groceryListsService.getLists(params.homeId);
    return json({ success: true, data: lists, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const list = await groceryListsService.getList(params.homeId, params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleCreateGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(createGroceryListSchema, body);
    if (!parsed.success) return parsed.response;

    const list = await groceryListsService.createList(params.homeId, parsed.data);
    return json({ success: true, data: list, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleUpdateGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(updateGroceryListSchema, body);
    if (!parsed.success) return parsed.response;
    const list = await groceryListsService.updateList(params.homeId, params.id, parsed.data);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleDeleteGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const list = await groceryListsService.deleteList(params.homeId, params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleCompleteGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const list = await groceryListsService.completeList(params.homeId, params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetDefaultList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const list = await groceryListsService.getOrCreateDefaultList(params.homeId);
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleResetGroceryList(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const list = await groceryListsService.resetScheduledList(params.id);
    if (!list) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: list, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleAddListItemByName(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(addListItemByNameSchema, body);
    if (!parsed.success) return parsed.response;

    const { name, quantity } = parsed.data;

    // Find or create the item in the pantry
    const item = await groceryListsService.findOrCreateItem(params.homeId, name);

    // Add it to the list
    const listItem = await groceryListsService.addListItem(params.homeId, params.listId, {
      itemId: item.id,
      quantity: quantity ?? 1,
    });

    if (!listItem) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: { listItem, item }, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetListStats(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const stats = await groceryListsService.getListStats(params.homeId, params.id);
    if (!stats) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: stats, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleAddListItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(addListItemSchema, body);
    if (!parsed.success) return parsed.response;

    const listItem = await groceryListsService.addListItem(params.homeId, params.listId, parsed.data);
    if (!listItem) {
      return json({ success: false, error: "List not found" }, 404);
    }
    return json({ success: true, data: listItem, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleRemoveListItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const listItem = await groceryListsService.removeListItem(params.homeId, params.listId, params.listItemId);
    if (!listItem) {
      return json({ success: false, error: "List item not found" }, 404);
    }
    return json({ success: true, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleToggleListItem(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const listItem = await groceryListsService.toggleListItem(params.homeId, params.listId, params.listItemId);
    if (!listItem) {
      return json({ success: false, error: "List item not found" }, 404);
    }
    return json({ success: true, data: listItem, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Chat handlers
// ============================================================================

async function handleListChatThreads(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const threads = await chatService.getThreads(params.homeId || auth.homeId);
    return json({ success: true, data: threads, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleCreateChatThread(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = validateBody(createThreadSchema, body);
    if (!parsed.success) return parsed.response;
    const thread = await chatService.createThread(params.homeId || auth.homeId, parsed.data.title);
    return json({ success: true, data: thread, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleGetMessages(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const messages = await chatService.getMessages(params.threadId, limit);
    return json({ success: true, data: messages, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

async function handleSendMessage(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = validateBody(sendMessageSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await chatService.sendMessage(
      params.threadId,
      params.homeId || auth.homeId,
      auth.userId,
      parsed.data.content
    );

    return json({ success: true, data: result, timestamp: new Date() }, 201);
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ============================================================================
// Budget handlers
// ============================================================================

async function handleGetBudget(request: Request, params: Record<string, string>, auth: AuthPayload): Promise<Response> {
  try {
    const budgetSummary = await budgetService.getBudgetSummary(params.homeId || auth.homeId);
    return json({ success: true, data: budgetSummary, timestamp: new Date() });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}
