/**
 * @pantry-pixie/sdk
 * TypeScript SDK for Pantry Pixie
 */

export {
  PantryPixieClient,
  HomeClient,
  ItemClient,
  GroceryListClient,
  ChatClient,
  type PantryPixieClientConfig,
} from "./client";

// Re-export core types for convenience
export type {
  User,
  Home,
  Item,
  GroceryList,
  ChatThread,
  ChatMessage,
  CreateItemInput,
  UpdateItemInput,
  CreateGroceryListInput,
  SendChatMessageInput,
  ApiResponse,
  PaginatedResponse,
  AuthToken,
  PixieIntent,
} from "@pantry-pixie/core";
