/**
 * WebSocket message types for client-side use
 * (Mirrors server-side types from src/server/ws/index.ts)
 */

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
    | "ping"
    | "pong"
    | "error";
  payload: unknown;
  timestamp: string;
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

export interface StatusWebSocketMessage extends WebSocketMessage {
  type: "status";
  payload: {
    status: "connected" | "typing" | "idle";
    message?: string;
    threadId?: string;
  };
}

export interface ListUpdateWebSocketMessage extends WebSocketMessage {
  type: "list_update";
  payload: {
    action: string;
    list: any;
    listItem?: any;
    homeId: string;
  };
}
