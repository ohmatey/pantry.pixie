/**
 * WebSocket handler for real-time chat with Pixie
 */

import type { ServerWebSocket } from "bun";
import * as chatService from "../services/chat";
import * as notificationsService from "../services/notifications";
import { eventBus } from "../services/events";
import { logger, logWebSocket } from "../lib/logger";
import { db, eq, usersTable } from "@pantry-pixie/core";

export interface GroceryListUI {
  id: string;
  name: string;
  items: Array<{
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    isCompleted: boolean;
  }>;
  completionPercentage: number;
  completedItems: number;
  totalItems: number;
}

export interface GroceryListsOverviewUI {
  lists: Array<{
    id: string;
    name: string;
    description?: string;
    status: "active" | "completed" | "archived";
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
    estimatedCost?: number;
    createdAt: string;
  }>;
}

export interface ListEditorUI {
  list: {
    id: string;
    name: string;
    description?: string;
    status: string;
    totalBudget?: number;
    estimatedCost?: number;
    items: Array<{
      id: string; // listItemId
      itemId: string; // pantry item ID
      name: string;
      quantity: number;
      unit?: string;
      notes?: string;
      estimatedPrice?: number;
      isCompleted: boolean;
    }>;
    completionPercentage: number;
    completedItems: number;
    totalItems: number;
  };
}

export type SerializedUI =
  | { type: "grocery-list"; data: GroceryListUI }
  | { type: "grocery-lists-overview"; data: GroceryListsOverviewUI }
  | { type: "list-editor"; data: ListEditorUI };

export interface WebSocketMessage {
  type:
    | "message"
    | "ui_message"
    | "status"
    | "inventory_update"
    | "list_update"
    | "partner_activity"
    | "ping"
    | "pong"
    | "error";
  payload: unknown;
  timestamp: string;
}

export interface PartnerActivityMessage extends WebSocketMessage {
  type: "partner_activity";
  payload: {
    actorName: string | null;
    actorId: string | null;
    action: "chat_started" | "chat_continued" | "item_added" | "item_removed";
    subject: string;
    threadId?: string;
    itemId?: string;
  };
}

export interface ChatWebSocketMessage extends WebSocketMessage {
  type: "message";
  payload: {
    threadId: string;
    role: "user" | "assistant";
    content: string;
    intent?: string;
    messageId?: string;
    listId?: string | null;
  };
}

export interface UIWebSocketMessage extends WebSocketMessage {
  type: "ui_message";
  payload: {
    threadId: string;
    role: "assistant";
    content: string;
    messageId: string;
    ui?: SerializedUI;
    isStreaming: boolean;
  };
}

export interface WSData {
  userId: string;
  homeId: string;
}

// Track connections per homeId for broadcasting
const homeConnections = new Map<string, Set<ServerWebSocket<WSData>>>();

// Subscribe to inventory events and broadcast to home clients
eventBus.on(
  "inventory:updated",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data: { action: string; item: any; homeId: string; actorId?: string }) => {
    broadcastToHome(data.homeId, {
      type: "inventory_update",
      payload: { action: data.action, item: data.item, homeId: data.homeId },
      timestamp: new Date().toISOString(),
    });

    // Broadcast partner activity for item mutations triggered by an actor
    if (data.actorId && (data.action === "added" || data.action === "removed")) {
      db.query.usersTable.findFirst({ where: eq(usersTable.id, data.actorId) })
        .then((user) => {
          const actorName = user?.name || "Your partner";
          broadcastPartnerActivity(data.homeId, {
            actorName: user?.name || null,
            actorId: data.actorId!,
            action: data.action === "added" ? "item_added" : "item_removed",
            subject: data.item.name,
            itemId: data.item.id,
          });
          // Persist a notification so an offline partner sees it later.
          notificationsService
            .notifyPartners(data.homeId, data.actorId, {
              type: "partner_activity",
              title: `${actorName} ${data.action === "added" ? "added" : "used up"} ${data.item.name}`,
              refId: data.item.id,
            })
            .catch(() => {/* non-critical */});
        })
        .catch(() => {/* ignore activity broadcast errors */});
    }
  },
);

// Subscribe to list events and broadcast to home clients
eventBus.on(
  "list:updated",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data: { action: string; list: any; listItem?: any; homeId: string }) => {
    broadcastToHome(data.homeId, {
      type: "list_update",
      payload: {
        action: data.action,
        list: data.list,
        listItem: data.listItem,
        homeId: data.homeId,
      },
      timestamp: new Date().toISOString(),
    });
  },
);

export function handleWebSocketOpen(ws: ServerWebSocket<WSData>): void {
  const { homeId } = ws.data;
  logWebSocket("connected", { homeId });

  if (!homeConnections.has(homeId)) {
    homeConnections.set(homeId, new Set());
  }
  homeConnections.get(homeId)!.add(ws);

  ws.send(
    JSON.stringify({
      type: "status",
      payload: { status: "connected", message: "Connected to Pantry Pixie" },
      timestamp: new Date().toISOString(),
    }),
  );
}

export function handleWebSocketMessage(
  ws: ServerWebSocket<WSData>,
  message: string | ArrayBuffer,
): void {
  try {
    const msg =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    const data = JSON.parse(msg) as WebSocketMessage;

    switch (data.type) {
      case "message":
        handleChatMessage(ws, data as ChatWebSocketMessage);
        break;
      case "ping":
        ws.send(
          JSON.stringify({
            type: "pong",
            payload: {},
            timestamp: new Date().toISOString(),
          }),
        );
        break;
      default:
        logger.warn({ type: data.type }, "Unknown WebSocket message type");
    }
  } catch (error) {
    logger.error({ err: error }, "Error parsing WebSocket message");
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { error: "Invalid message format" },
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

export function handleWebSocketClose(ws: ServerWebSocket<WSData>): void {
  const { homeId } = ws.data;
  logWebSocket("disconnected", { homeId });

  const connections = homeConnections.get(homeId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      homeConnections.delete(homeId);
    }
  }
}

async function handleChatMessage(
  ws: ServerWebSocket<WSData>,
  msg: ChatWebSocketMessage,
): Promise<void> {
  const { userId, homeId } = ws.data;
  const { threadId, content, listId } = msg.payload;

  if (!threadId || !content) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { error: "threadId and content are required" },
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // Send typing indicator
  broadcastToHome(homeId, {
    type: "status",
    payload: { status: "typing", threadId },
    timestamp: new Date().toISOString(),
  });

  try {
    const result = await chatService.sendMessage(
      threadId,
      homeId,
      userId,
      content,
      listId,
    );

    // Broadcast the user message to other clients
    broadcastToHome(
      homeId,
      {
        type: "message",
        payload: {
          threadId,
          role: "user",
          content: result.userMessage.content,
          intent: result.userMessage.intent || undefined,
          messageId: result.userMessage.id,
        },
        timestamp: result.userMessage.createdAt.toISOString(),
      },
      ws, // exclude sender
    );

    // Broadcast partner activity (get actor name from DB)
    db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) })
      .then((user) => {
        broadcastPartnerActivity(
          homeId,
          {
            actorName: user?.name || null,
            actorId: userId,
            action: result.isFirstMessage ? "chat_started" : "chat_continued",
            subject: result.userMessage.content.slice(0, 60),
            threadId,
          },
          ws,
        );
      })
      .catch(() => {/* ignore activity broadcast errors */});

    // Start streaming the assistant response
    let accumulatedText = "";

    await result.streamHandler(
      // onChunk: broadcast progressive updates
      (chunk: string) => {
        accumulatedText += chunk;
        const streamMsg: UIWebSocketMessage = {
          type: "ui_message",
          payload: {
            threadId,
            role: "assistant",
            content: accumulatedText,
            messageId: result.assistantMessageId,
            isStreaming: true,
          },
          timestamp: new Date().toISOString(),
        };
        broadcastToHome(homeId, streamMsg);
      },
      // onComplete: broadcast final message with UI data
      (fullText: string, ui?: SerializedUI) => {
        const finalMsg: UIWebSocketMessage = {
          type: "ui_message",
          payload: {
            threadId,
            role: "assistant",
            content: fullText,
            messageId: result.assistantMessageId,
            ui,
            isStreaming: false,
          },
          timestamp: new Date().toISOString(),
        };
        broadcastToHome(homeId, finalMsg);

        // Clear typing indicator
        broadcastToHome(homeId, {
          type: "status",
          payload: { status: "idle", threadId },
          timestamp: new Date().toISOString(),
        });
      },
    );
  } catch (error) {
    logger.error({ err: error }, "WebSocket chat error");
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { error: "Failed to process message" },
        timestamp: new Date().toISOString(),
      }),
    );

    // Clear typing indicator
    broadcastToHome(homeId, {
      type: "status",
      payload: { status: "idle", threadId },
      timestamp: new Date().toISOString(),
    });
  }
}

function broadcastToHome(
  homeId: string,
  message: WebSocketMessage,
  exclude?: ServerWebSocket<WSData>,
): void {
  const connections = homeConnections.get(homeId);
  if (!connections) return;

  const data = JSON.stringify(message);
  for (const ws of connections) {
    if (ws !== exclude) {
      ws.send(data);
    }
  }
}

export function broadcastPartnerActivity(
  homeId: string,
  payload: PartnerActivityMessage["payload"],
  excludeWs?: ServerWebSocket<WSData>,
): void {
  broadcastToHome(
    homeId,
    {
      type: "partner_activity",
      payload,
      timestamp: new Date().toISOString(),
    },
    excludeWs,
  );
}
