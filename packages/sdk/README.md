# @pantry-pixie/sdk

TypeScript SDK for the Pantry Pixie API. Provides `PantryPixieClient` with typed sub-clients for homes, items, grocery lists, and chat.

## Installation

```bash
bun add @pantry-pixie/sdk
```

## Quick start

```typescript
import { PantryPixieClient } from "@pantry-pixie/sdk";

const client = new PantryPixieClient({
  baseUrl: "http://localhost:3000",
  accessToken: "your-jwt-token",
});

// List pantry items
const items = await client.items.list(homeId);

// Add an item
const milk = await client.items.create(homeId, {
  name: "Milk",
  quantity: 2,
  unit: "liter",
  category: "dairy",
});

// Chat with Pixie
const thread = await client.chat.createThread(homeId);
const reply = await client.chat.sendMessage(homeId, thread.data.id, {
  content: "What's about to expire?",
});
```

## Client configuration

```typescript
interface PantryPixieClientConfig {
  baseUrl: string;        // API base URL (trailing slash stripped)
  apiKey?: string;        // Sent as X-API-Key header
  accessToken?: string;   // Sent as Bearer token
  timeout?: number;       // Request timeout in ms (default: 30000)
}
```

Update the token after login:

```typescript
client.setAccessToken(newToken);
```

## API reference

All methods return `Promise<ApiResponse<T>>` unless noted. Paginated endpoints return `Promise<ApiResponse<PaginatedResponse<T>>>`.

### `client.homes` — HomeClient

| Method | Parameters | Returns |
|---|---|---|
| `list()` | — | `Home[]` |
| `get(homeId)` | `homeId: string` | `Home` |
| `create(data)` | `{ name, description?, monthlyBudget? }` | `Home` |
| `update(homeId, data)` | `homeId, Partial<{ name, description, monthlyBudget }>` | `Home` |
| `delete(homeId)` | `homeId: string` | `{ success: boolean }` |

### `client.items` — ItemClient

| Method | Parameters | Returns |
|---|---|---|
| `list(homeId, options?)` | `homeId, { page?, limit? }` | `PaginatedResponse<Item>` |
| `get(homeId, itemId)` | `homeId, itemId` | `Item` |
| `create(homeId, data)` | `homeId, CreateItemInput` | `Item` |
| `update(homeId, itemId, data)` | `homeId, itemId, UpdateItemInput` | `Item` |
| `delete(homeId, itemId)` | `homeId, itemId` | `{ success: boolean }` |

**CreateItemInput**: `{ name, quantity?, unit?, category?, expiresAt?, location?, price?, isRecurring?, recurringInterval?, notes? }`

### `client.lists` — GroceryListClient

| Method | Parameters | Returns |
|---|---|---|
| `list(homeId, options?)` | `homeId, { page?, limit? }` | `PaginatedResponse<GroceryList>` |
| `get(homeId, listId)` | `homeId, listId` | `GroceryList` |
| `create(homeId, data)` | `homeId, CreateGroceryListInput` | `GroceryList` |
| `update(homeId, listId, data)` | `homeId, listId, Partial<CreateGroceryListInput>` | `GroceryList` |
| `delete(homeId, listId)` | `homeId, listId` | `{ success: boolean }` |

**CreateGroceryListInput**: `{ name, description?, totalBudget?, items?: Array<{ itemId, quantity }> }`

### `client.chat` — ChatClient

| Method | Parameters | Returns |
|---|---|---|
| `listThreads(homeId)` | `homeId` | `ChatThread[]` |
| `getThread(homeId, threadId)` | `homeId, threadId` | `ChatThread` |
| `createThread(homeId, data?)` | `homeId, { title? }` | `ChatThread` |
| `sendMessage(homeId, threadId, data)` | `homeId, threadId, { content, intent? }` | `ChatMessage` |
| `getMessages(homeId, threadId, options?)` | `homeId, threadId, { limit? }` | `ChatMessage[]` |

## Re-exported types

The SDK re-exports commonly used types from `@pantry-pixie/core`:

- **Entities**: `User`, `Home`, `Item`, `GroceryList`, `ChatThread`, `ChatMessage`
- **Inputs**: `CreateItemInput`, `UpdateItemInput`, `CreateGroceryListInput`, `SendChatMessageInput`
- **Responses**: `ApiResponse<T>`, `PaginatedResponse<T>`, `AuthToken`
- **Enums**: `PixieIntent`

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Setup

```bash
git clone <repo-url> && cd pantry.pixie
bun install
```

### Commands

```bash
bun run build:sdk    # Compile TypeScript to dist/
bun run dev          # Watch mode (tsc --watch) — run from packages/sdk/
```

### Project structure

```
packages/sdk/
├── src/
│   ├── index.ts     # Barrel export — all classes + re-exported types
│   └── client.ts    # PantryPixieClient + HomeClient, ItemClient,
│                    #   GroceryListClient, ChatClient
└── package.json
```

### URL patterns

The SDK targets these API paths:

```
/api/homes
/api/homes/:homeId
/api/homes/:homeId/items
/api/homes/:homeId/items/:itemId
/api/homes/:homeId/lists
/api/homes/:homeId/lists/:listId
/api/homes/:homeId/chat/threads
/api/homes/:homeId/chat/threads/:threadId/messages
```
