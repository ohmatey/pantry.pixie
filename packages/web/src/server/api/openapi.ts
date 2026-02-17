/**
 * OpenAPI 3.0 spec generation for the Pantry Pixie API.
 * Uses @asteasolutions/zod-to-openapi for schema registration.
 */

import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
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

// Extend zod once (idempotent)
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ============================================================================
// Security scheme
// ============================================================================

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// ============================================================================
// Reusable response schemas
// ============================================================================

const TimestampSchema = z.object({ timestamp: z.string().datetime() }).openapi("Timestamp");

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
}).openapi("ErrorResponse");

const SuccessSchema = z.object({
  success: z.literal(true),
  timestamp: z.string().datetime(),
}).openapi("SuccessResponse");

// ============================================================================
// Domain schemas
// ============================================================================

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  homeId: z.string().uuid(),
}).openapi("User");

const AuthTokenSchema = z.object({
  token: z.string(),
  user: UserSchema,
}).openapi("AuthToken");

const MeSchema = z.object({
  userId: z.string().uuid(),
  homeId: z.string().uuid(),
  email: z.string().email(),
}).openapi("Me");

const HomeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  currency: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("Home");

const HomeWithRoleSchema = HomeSchema.extend({
  memberCount: z.number().int(),
  role: z.string(),
}).openapi("HomeWithRole");

const HomeMemberSchema = z.object({
  id: z.string().uuid(),
  homeId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string(),
  joinedAt: z.string().datetime(),
}).openapi("HomeMember");

const InviteSchema = z.object({
  code: z.string(),
  homeId: z.string().uuid(),
  createdBy: z.string().uuid(),
  expiresAt: z.string().datetime(),
}).openapi("Invite");

const ItemSchema = z.object({
  id: z.string().uuid(),
  homeId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  isChecked: z.boolean(),
  isRecurring: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("Item");

const ItemStatsSchema = z.object({
  total: z.number().int(),
  checked: z.number().int(),
  categories: z.record(z.number().int()),
}).openapi("ItemStats");

const GroceryListSchema = z.object({
  id: z.string().uuid(),
  homeId: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  totalBudget: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("GroceryList");

const ListStatsSchema = z.object({
  total: z.number().int(),
  checked: z.number().int(),
  estimatedTotal: z.number(),
}).openapi("ListStats");

const ListItemSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number(),
  isChecked: z.boolean(),
}).openapi("ListItem");

const ChatThreadSchema = z.object({
  id: z.string().uuid(),
  homeId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("ChatThread");

const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  intent: z.string().optional(),
  createdAt: z.string().datetime(),
}).openapi("ChatMessage");

const BudgetSummarySchema = z.object({
  monthlyBudget: z.number().nullable(),
  currentMonthSpend: z.number(),
  remaining: z.number().nullable(),
}).openapi("BudgetSummary");

// Register all input schemas
registry.register("RegisterRequest", registerSchema);
registry.register("LoginRequest", loginSchema);
registry.register("CreateHomeRequest", createHomeSchema);
registry.register("UpdateHomeRequest", updateHomeSchema);
registry.register("CreateItemRequest", createItemSchema);
registry.register("UpdateItemRequest", updateItemSchema);
registry.register("CreateGroceryListRequest", createGroceryListSchema);
registry.register("UpdateGroceryListRequest", updateGroceryListSchema);
registry.register("AddListItemRequest", addListItemSchema);
registry.register("AddListItemByNameRequest", addListItemByNameSchema);
registry.register("CreateThreadRequest", createThreadSchema);
registry.register("SendMessageRequest", sendMessageSchema);

// ============================================================================
// Helper to build standard response shapes
// ============================================================================

function dataResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: SuccessSchema.extend({ data: schema }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden — not a member of this home",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  };
}

function createdResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    201: {
      description: "Created",
      content: {
        "application/json": {
          schema: SuccessSchema.extend({ data: schema }),
        },
      },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  };
}

const security = [{ bearerAuth: [] }];

// ============================================================================
// Auth routes
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: { content: { "application/json": { schema: registerSchema } } } },
  responses: {
    201: {
      description: "User registered successfully",
      content: { "application/json": { schema: SuccessSchema.extend({ data: AuthTokenSchema }) } },
    },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    409: { description: "Email already registered", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Log in and receive a JWT",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: {
      description: "Login successful",
      content: { "application/json": { schema: SuccessSchema.extend({ data: AuthTokenSchema }) } },
    },
    401: { description: "Invalid credentials", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user identity",
  security,
  responses: {
    200: {
      description: "Current user",
      content: { "application/json": { schema: SuccessSchema.extend({ data: MeSchema }) } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// ============================================================================
// Home routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/api/homes",
  tags: ["Homes"],
  summary: "List all homes the current user belongs to",
  security,
  responses: dataResponse(z.array(HomeWithRoleSchema)),
});

registry.registerPath({
  method: "post",
  path: "/api/homes",
  tags: ["Homes"],
  summary: "Create a new home",
  security,
  request: { body: { content: { "application/json": { schema: createHomeSchema } } } },
  responses: createdResponse(HomeSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{id}",
  tags: ["Homes"],
  summary: "Get a home by ID (membership required)",
  security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { ...dataResponse(HomeSchema), 404: { description: "Home not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "put",
  path: "/api/homes/{id}",
  tags: ["Homes"],
  summary: "Update a home name (admin or owner required)",
  security,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateHomeSchema } } },
  },
  responses: { ...dataResponse(HomeSchema), 403: { description: "Admin role required", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/members",
  tags: ["Homes"],
  summary: "List members of a home",
  security,
  request: { params: z.object({ homeId: z.string().uuid() }) },
  responses: dataResponse(z.array(HomeMemberSchema)),
});

// ============================================================================
// Invite routes
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/invites",
  tags: ["Homes"],
  summary: "Create an invite link (admin or owner required)",
  security,
  request: { params: z.object({ homeId: z.string().uuid() }) },
  responses: createdResponse(InviteSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/invites/{code}",
  tags: ["Homes"],
  summary: "Get invite info by code (public)",
  request: { params: z.object({ code: z.string() }) },
  responses: {
    200: { description: "Invite info", content: { "application/json": { schema: SuccessSchema.extend({ data: InviteSchema }) } } },
    404: { description: "Invalid or expired invite", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/invites/{code}/accept",
  tags: ["Homes"],
  summary: "Accept an invite and join the home",
  security,
  request: { params: z.object({ code: z.string() }) },
  responses: {
    200: { description: "Invite accepted", content: { "application/json": { schema: SuccessSchema.extend({ data: HomeMemberSchema }) } } },
    400: { description: "Invalid or expired invite", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// ============================================================================
// Item routes
// ============================================================================

const homeIdParam = z.object({ homeId: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/items",
  tags: ["Items"],
  summary: "List pantry items",
  security,
  request: {
    params: homeIdParam,
    query: z.object({
      category: z.string().optional().openapi({ description: "Filter by item category" }),
      search: z.string().optional().openapi({ description: "Full-text search" }),
    }),
  },
  responses: dataResponse(z.array(ItemSchema)),
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/items",
  tags: ["Items"],
  summary: "Add a pantry item",
  security,
  request: {
    params: homeIdParam,
    body: { content: { "application/json": { schema: createItemSchema } } },
  },
  responses: createdResponse(ItemSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/items/stats",
  tags: ["Items"],
  summary: "Get item statistics for a home",
  security,
  request: { params: homeIdParam },
  responses: dataResponse(ItemStatsSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/items/{id}",
  tags: ["Items"],
  summary: "Get a single pantry item",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(ItemSchema), 404: { description: "Item not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "put",
  path: "/api/homes/{homeId}/items/{id}",
  tags: ["Items"],
  summary: "Update a pantry item",
  security,
  request: {
    params: homeIdParam.extend({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateItemSchema } } },
  },
  responses: { ...dataResponse(ItemSchema), 404: { description: "Item not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "patch",
  path: "/api/homes/{homeId}/items/{id}/toggle",
  tags: ["Items"],
  summary: "Toggle item checked status",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(ItemSchema), 404: { description: "Item not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "delete",
  path: "/api/homes/{homeId}/items/{id}",
  tags: ["Items"],
  summary: "Delete a pantry item",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Item not found", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// ============================================================================
// Grocery list routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/lists",
  tags: ["Lists"],
  summary: "List all grocery lists for a home",
  security,
  request: { params: homeIdParam },
  responses: dataResponse(z.array(GroceryListSchema)),
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/lists",
  tags: ["Lists"],
  summary: "Create a grocery list",
  security,
  request: {
    params: homeIdParam,
    body: { content: { "application/json": { schema: createGroceryListSchema } } },
  },
  responses: createdResponse(GroceryListSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/lists/default",
  tags: ["Lists"],
  summary: "Get or create the default grocery list",
  security,
  request: { params: homeIdParam },
  responses: dataResponse(GroceryListSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/lists/{id}",
  tags: ["Lists"],
  summary: "Get a grocery list by ID",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(GroceryListSchema), 404: { description: "List not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "put",
  path: "/api/homes/{homeId}/lists/{id}",
  tags: ["Lists"],
  summary: "Update a grocery list",
  security,
  request: {
    params: homeIdParam.extend({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateGroceryListSchema } } },
  },
  responses: { ...dataResponse(GroceryListSchema), 404: { description: "List not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "delete",
  path: "/api/homes/{homeId}/lists/{id}",
  tags: ["Lists"],
  summary: "Delete a grocery list (admin or owner required)",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: SuccessSchema } } },
    403: { description: "Admin role required", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "List not found", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/homes/{homeId}/lists/{id}/complete",
  tags: ["Lists"],
  summary: "Mark a grocery list as completed",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(GroceryListSchema), 404: { description: "List not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "patch",
  path: "/api/homes/{homeId}/lists/{id}/reset",
  tags: ["Lists"],
  summary: "Reset a scheduled list (admin or owner required)",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(GroceryListSchema), 403: { description: "Admin role required", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/lists/{id}/stats",
  tags: ["Lists"],
  summary: "Get statistics for a grocery list",
  security,
  request: { params: homeIdParam.extend({ id: z.string().uuid() }) },
  responses: { ...dataResponse(ListStatsSchema), 404: { description: "List not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/lists/{listId}/items",
  tags: ["Lists"],
  summary: "Add an existing pantry item to a grocery list",
  security,
  request: {
    params: homeIdParam.extend({ listId: z.string().uuid() }),
    body: { content: { "application/json": { schema: addListItemSchema } } },
  },
  responses: createdResponse(ListItemSchema),
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/lists/{listId}/items/by-name",
  tags: ["Lists"],
  summary: "Add an item to a grocery list by name (creates pantry item if needed)",
  security,
  request: {
    params: homeIdParam.extend({ listId: z.string().uuid() }),
    body: { content: { "application/json": { schema: addListItemByNameSchema } } },
  },
  responses: createdResponse(z.object({ listItem: ListItemSchema, item: ItemSchema })),
});

registry.registerPath({
  method: "delete",
  path: "/api/homes/{homeId}/lists/{listId}/items/{listItemId}",
  tags: ["Lists"],
  summary: "Remove an item from a grocery list",
  security,
  request: { params: homeIdParam.extend({ listId: z.string().uuid(), listItemId: z.string().uuid() }) },
  responses: {
    200: { description: "Removed", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "List item not found", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/homes/{homeId}/lists/{listId}/items/{listItemId}/toggle",
  tags: ["Lists"],
  summary: "Toggle checked state of a grocery list item",
  security,
  request: { params: homeIdParam.extend({ listId: z.string().uuid(), listItemId: z.string().uuid() }) },
  responses: { ...dataResponse(ListItemSchema), 404: { description: "List item not found", content: { "application/json": { schema: ErrorResponseSchema } } } },
});

// ============================================================================
// Chat routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/chat/threads",
  tags: ["Chat"],
  summary: "List chat threads for a home",
  security,
  request: { params: homeIdParam },
  responses: dataResponse(z.array(ChatThreadSchema)),
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/chat/threads",
  tags: ["Chat"],
  summary: "Create a new chat thread",
  security,
  request: {
    params: homeIdParam,
    body: { content: { "application/json": { schema: createThreadSchema } } },
  },
  responses: createdResponse(ChatThreadSchema),
});

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/chat/threads/{threadId}/messages",
  tags: ["Chat"],
  summary: "Get messages for a chat thread",
  security,
  request: {
    params: homeIdParam.extend({ threadId: z.string().uuid() }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().openapi({ description: "Max messages to return (1–100, default 50)" }),
    }),
  },
  responses: dataResponse(z.array(ChatMessageSchema)),
});

registry.registerPath({
  method: "post",
  path: "/api/homes/{homeId}/chat/threads/{threadId}/messages",
  tags: ["Chat"],
  summary: "Send a message to Pixie and receive a response",
  description: "Sends a user message, runs the AI agent, and returns both the user message and the full assistant response. Streaming responses are available via the WebSocket endpoint.",
  security,
  request: {
    params: homeIdParam.extend({ threadId: z.string().uuid() }),
    body: { content: { "application/json": { schema: sendMessageSchema } } },
  },
  responses: createdResponse(z.object({ userMessage: ChatMessageSchema, assistantText: z.string() })),
});

// ============================================================================
// Budget routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/api/homes/{homeId}/budget",
  tags: ["Budget"],
  summary: "Get budget summary for a home",
  security,
  request: { params: homeIdParam },
  responses: dataResponse(BudgetSummarySchema),
});

// ============================================================================
// Generator
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedSpec: Record<string, any> | null = null;

export function generateOpenApiDocument(): Record<string, any> {
  if (cachedSpec) return cachedSpec;

  const generator = new OpenApiGeneratorV3(registry.definitions);
  cachedSpec = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Pantry Pixie API",
      version: "1.0.0",
      description: "AI-powered kitchen companion — manage your pantry, grocery lists, and budget.",
    },
    servers: [{ url: "/" }],
  });

  return cachedSpec;
}
