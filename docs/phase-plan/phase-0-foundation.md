# Phase 0: Foundation (Weeks 1-3)

## Overview

Phase 0 establishes the technical and organizational foundation for Pantry Pixie. This phase focuses on setting up infrastructure, core data models, authentication, the AI agent framework, and real-time communication systems that all downstream phases depend on.

**Duration:** 3 weeks
**Goal:** Deploy a functional monorepo with working API, database, auth, agent framework, and WebSocket infrastructure
**Success Criteria:** Core team can make API requests, Pixie responds to messages, real-time updates sync across clients

---

## 1. Monorepo Setup (Weeks 1-2, 5 days of effort)

### Objective
Create a scalable, maintainable Bun workspace that will house multiple packages (core, sdk, cli, web) with shared dependencies and tooling.

### Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Package Manager | Bun workspace | All-in-one: build, test, package; zero-install potential |
| Workspace Structure | Monorepo with `packages/` | Clear separation; enables sdk/cli extraction later |
| TypeScript Config | Single tsconfig base | Shared types; consistency across packages |
| Linting | Biome | Fast, opinionated, built for monorepos |
| Formatting | Biome | Paired with linting; no config needed |
| Testing | Bun test + Vitest (if needed) | Bun test for unit; Vitest for integration |

### Directory Structure

```
pantry-pixie/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── packages/
│   ├── core/                      # Business logic, entities, services
│   │   ├── src/
│   │   │   ├── entities/          # Data models
│   │   │   ├── services/          # Business logic
│   │   │   ├── types/             # Shared types
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── sdk/                       # TypeScript SDK for programmatic access
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                       # CLI tool (@pantry-pixie/cli)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                       # PWA (React/Vue/Svelte)
│       ├── public/
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
├── docs/
│   ├── phase-plan/
│   ├── api.md
│   └── architecture.md
├── .env.example
├── biome.json
├── bunfig.toml
├── package.json
└── README.md
```

### Deliverables

- [ ] Bun workspace configured with all packages
- [ ] Shared tsconfig and build pipeline
- [ ] Biome linting/formatting rules committed
- [ ] Each package has runnable tests (even if empty)
- [ ] CI/CD skeleton (GitHub Actions) with linting, build, test steps
- [ ] README with monorepo development guide

### Acceptance Criteria
```bash
# All of these should work:
bun install
bun run build          # Builds all packages
bun run lint           # Lints all packages
bun run test           # Runs tests in all packages
bun run dev            # Runs dev server for web package
```

---

## 2. Database Schema Design (Weeks 1-2, 7 days of effort)

### Objective
Design a normalized PostgreSQL schema using Drizzle ORM that supports all core features (homes, users, grocery lists, chat, recurring items).

### Core Entities

#### User
Represents a person who can authenticate and join homes.

```typescript
// packages/core/src/entities/user.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(), // For JWT phase; OAuth later
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Home
Represents a household/apartment/shared space.

```typescript
export const homes = pgTable('homes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),               // e.g., "Apartment 42"
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Later: currency, location, timezone for Bangkok context
});
```

#### HomeMember
Join table: links users to homes with a role.

```typescript
export const homeMembers = pgTable('home_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeId: uuid('home_id')
    .references(() => homes.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // e.g., 'owner', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  // Index: (homeId, userId) unique
});
```

#### Item
A grocery/household item (e.g., "eggs", "coriander", "toilet paper").

```typescript
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeId: uuid('home_id')
    .references(() => homes.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),               // e.g., "eggs"
  description: text('description'),           // e.g., "free-range, dozen"
  category: text('category'),                 // e.g., 'produce', 'dairy', 'staple'
  quantity: integer('quantity').default(1),   // How many to buy
  unit: text('unit'),                         // e.g., 'dozen', 'kg', 'pack', 'bottle'
  estimatedPrice: numeric('estimated_price', { precision: 10, scale: 2 }), // THB
  lastPurchasedAt: timestamp('last_purchased_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Index: (homeId, name)
});
```

#### GroceryList
A collection of ItemIds with a state (draft, approved, completed).

```typescript
export const groceryLists = pgTable('grocery_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeId: uuid('home_id')
    .references(() => homes.id, { onDelete: 'cascade' })
    .notNull(),
  state: text('state').notNull(),             // 'draft', 'approved', 'completed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  // Index: (homeId, state)
});
```

#### ListItem
Join table: items in a list with per-item state.

```typescript
export const listItems = pgTable('list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => groceryLists.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  state: text('state').notNull(),             // 'pending', 'purchased', 'removed'
  addedBy: uuid('added_by')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  purchasedBy: uuid('purchased_by')
    .references(() => users.id, { onDelete: 'set null' }),
  purchasedAt: timestamp('purchased_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Index: (listId, state)
});
```

#### ChatThread
A conversation between user(s) and Pixie for a specific home.

```typescript
export const chatThreads = pgTable('chat_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeId: uuid('home_id')
    .references(() => homes.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title'),                       // e.g., "Weekly Sync"
  context: jsonb('context'),                  // { topic: 'grocery', ... }
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Index: (homeId, createdAt)
});
```

#### ChatMessage
A single message in a thread (from user or Pixie).

```typescript
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .references(() => chatThreads.id, { onDelete: 'cascade' })
    .notNull(),
  author: text('author').notNull(),           // 'user' or 'pixie'
  authorId: uuid('author_id')
    .references(() => users.id, { onDelete: 'set null' }), // null if pixie
  content: text('content').notNull(),         // Plain text message
  metadata: jsonb('metadata'),                // { intent, entities, confidence, ... }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Index: (threadId, createdAt)
});
```

#### Recurring Item (for Phase 3, but schema-ready)
A template for items that should recur on a schedule.

```typescript
export const recurringItems = pgTable('recurring_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeId: uuid('home_id')
    .references(() => homes.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  frequency: text('frequency').notNull(),     // 'weekly', 'biweekly', 'monthly'
  nextDueAt: timestamp('next_due_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Index: (homeId, nextDueAt)
});
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUID primary keys | Distributed-ready; client-side generation if needed later |
| Soft deletes? No | Explicit CASCADE for clean data model; easier to understand |
| JSONB for metadata | Flexible for AI metadata (confidence, intent, entities) without schema changes |
| Normalized schema | Avoids duplication; supports efficient queries and filtering |
| Timestamps on all entities | Audit trail; supports "last modified" sorting |
| No automatic deletes on user removal | Preserve audit trail; explicit cascade behavior only where sensible |

### Migration Strategy
- Use Drizzle migrations from day 1 (even for initial schema)
- Each migration is numbered and idempotent
- `schema.ts` is the source of truth for the current schema
- Migrations auto-generated from schema changes where possible

### Deliverables

- [ ] `packages/core/src/entities/` with all schema definitions
- [ ] Drizzle config (`drizzle.config.ts`) pointing to Postgres
- [ ] Initial migration file (`drizzle/migrations/0001_initial.sql`)
- [ ] Seed script (`scripts/seed.ts`) for local development
- [ ] Database ERD or ASCII diagram in docs
- [ ] `packages/core/src/db.ts` exporting drizzle client instance

### Acceptance Criteria
```bash
# All of these should work:
bun run db:migrate     # Apply migrations
bun run db:seed        # Populate test data
bun run db:studio      # View data in Drizzle Studio (local only)
# Verify: 9 tables created; all foreign keys intact
```

---

## 3. Authentication System (Weeks 2-3, 4 days of effort)

### Objective
Implement JWT-based authentication for API and WebSocket. Plan for OAuth transition in Phase 2.

### Architecture

#### Phase 0: JWT (Bearer Token)
- Username/email + password-based signup/login
- Passwords hashed with bcrypt (or similar)
- JWT issued on successful login
- Token includes: `{ sub: userId, homeId, role, iat, exp }`
- Token lifetime: 24 hours (refresh token: 7 days, Phase 2+)

#### Phase 2+: OAuth (Planned)
- Google, Apple, Line OAuth providers
- Seamless login; no password management

### Implementation

```typescript
// packages/core/src/services/auth.ts
import jwt from '@elysiajs/jwt'; // Or use jsonwebtoken
import bcrypt from 'bcrypt';
import { users } from '../entities/user';

export interface AuthPayload {
  sub: string;      // userId
  homeId?: string;  // Active home (can change)
  role: string;     // 'owner' or 'member'
  iat: number;
  exp: number;
}

export async function signup(email: string, password: string, name: string) {
  // Validate email uniqueness
  // Hash password
  // Create user in DB
  // Return JWT token
}

export async function login(email: string, password: string) {
  // Look up user by email
  // Verify password hash
  // Return JWT token
}

export function verifyToken(token: string): AuthPayload {
  // Verify signature, expiration
  // Return payload
}

export async function switchHome(userId: string, homeId: string) {
  // Verify user is member of home
  // Return new JWT with updated homeId
}
```

### Middleware

```typescript
// packages/core/src/middleware/auth.ts
export function requireAuth() {
  return (ctx) => {
    const token = ctx.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    ctx.set('user', payload);
  };
}

export function requireHomeAccess() {
  return (ctx) => {
    const payload = ctx.get('user');
    const requestedHomeId = ctx.req.query.homeId;
    if (payload.homeId !== requestedHomeId) {
      throw new Error('Forbidden');
    }
  };
}
```

### API Endpoints

```
POST /auth/signup
  Body: { email, password, name }
  Response: { token, user: { id, email, name } }

POST /auth/login
  Body: { email, password }
  Response: { token, user: { id, email, name } }

POST /auth/switch-home
  Headers: Authorization: Bearer <token>
  Body: { homeId }
  Response: { token, home: { id, name } }

GET /auth/me
  Headers: Authorization: Bearer <token>
  Response: { user, activeHome }
```

### Deliverables

- [ ] `packages/core/src/services/auth.ts` with signup/login/verify
- [ ] Auth middleware in `packages/core/src/middleware/`
- [ ] Password hashing (bcrypt) configured
- [ ] JWT configuration (secret, lifetime, algorithm)
- [ ] Auth tests covering happy path + error cases
- [ ] `.env.example` with JWT_SECRET placeholder

### Acceptance Criteria
```bash
# Happy path:
POST /auth/signup { email, password, name } → 200 + token
POST /auth/login { email, password } → 200 + token
GET /auth/me (with token) → 200 + user
POST /auth/switch-home (with token) → 200 + new token
# Error cases:
POST /auth/signup (duplicate email) → 400
POST /auth/login (wrong password) → 401
GET /auth/me (no token) → 401
POST /auth/switch-home (user not member) → 403
```

---

## 4. Mastra.ai Agent Setup (Weeks 1-3, 8 days of effort)

### Objective
Integrate Mastra.ai as the agent framework for Pixie. Build the intent classification and entity extraction pipeline.

### Architecture

#### Agent Framework
```typescript
// packages/core/src/agent/pixie.ts
import { Agent } from '@mastra/core';

export const pixieAgent = new Agent({
  name: 'pixie',
  model: 'gpt-4',        // Or claude-3, configurable
  instructions: `You are Pixie, a domestic AI steward helping households coordinate groceries.
    - Be conversational, warm, and helpful
    - Ask clarifying questions if needed
    - Respond with structured JSON when adding items
    - Remember household preferences and patterns
    - Be neutral in multi-user scenarios; avoid choosing sides
  `,
  tools: {
    addItem: {
      description: 'Add a single item to the grocery list',
      params: {
        name: 'string (item name)',
        quantity: 'number (how many)',
        unit: 'string (dozen, kg, pack, etc)',
        category: 'string (produce, dairy, staple, etc)',
        notes: 'string (optional: free-range, organic, etc)',
      },
    },
    listItems: {
      description: 'List all items in the current draft grocery list',
      params: {},
    },
    setRecurring: {
      description: 'Mark an item as recurring (weekly, biweekly, monthly)',
      params: {
        itemId: 'string (UUID)',
        frequency: 'string (weekly | biweekly | monthly)',
      },
    },
  },
});
```

#### Intent Classification
Pixie should classify incoming messages into intents:

```typescript
// packages/core/src/agent/intents.ts
export type Intent =
  | 'add_item'           // "We need eggs"
  | 'list_items'         // "What do we have?"
  | 'mark_purchased'     // "I got the eggs"
  | 'set_recurring'      // "Eggs every week"
  | 'budget_query'       // "How much did we spend?"
  | 'chat'               // "How are you?" (conversational)
  | 'unclear';           // Fallback

export async function classifyIntent(message: string): Promise<Intent> {
  const response = await pixieAgent.classify(message, [
    'add_item', 'list_items', 'mark_purchased', 'set_recurring', 'budget_query', 'chat', 'unclear'
  ]);
  return response.intent;
}
```

#### Entity Extraction
Extract structured data (items, quantities, etc.) from natural language:

```typescript
// packages/core/src/agent/entities.ts
export interface ExtractedEntity {
  type: 'item' | 'quantity' | 'unit' | 'category' | 'recurring_frequency';
  value: string;
  confidence: number; // 0.0 to 1.0
}

export async function extractEntities(message: string): Promise<ExtractedEntity[]> {
  const response = await pixieAgent.extract(message, [
    { type: 'item', description: 'The grocery/household item' },
    { type: 'quantity', description: 'How many (number)' },
    { type: 'unit', description: 'Unit of measurement (dozen, kg, pack, bottle)' },
    { type: 'category', description: 'Item category (produce, dairy, staple, household, etc)' },
    { type: 'recurring_frequency', description: 'Recurrence pattern (weekly, biweekly, monthly)' },
  ]);
  return response.entities;
}
```

#### Structured Response System
Pixie's responses are validated and formatted before being sent to the client:

```typescript
// packages/core/src/agent/response.ts
export interface PixieResponse {
  message: string;              // Human-readable message
  intent: Intent;               // Classified intent
  entities: ExtractedEntity[];  // Extracted structured data
  action?: {
    type: 'add_item' | 'mark_purchased' | 'set_recurring';
    payload: Record<string, any>;
  };
  confidence: number;           // 0.0 to 1.0
  requiresConfirmation: boolean; // User should approve before executing
}

export async function processMessage(
  message: string,
  threadId: string,
  userId: string
): Promise<PixieResponse> {
  const intent = await classifyIntent(message);
  const entities = await extractEntities(message);

  let action: PixieResponse['action'] | undefined;
  if (intent === 'add_item' && entities.length > 0) {
    action = {
      type: 'add_item',
      payload: {
        name: extractValue(entities, 'item'),
        quantity: parseInt(extractValue(entities, 'quantity') || '1'),
        unit: extractValue(entities, 'unit') || 'pack',
        category: extractValue(entities, 'category') || 'household',
      },
    };
  }

  return {
    message: await generateNaturalResponse(intent, entities),
    intent,
    entities,
    action,
    confidence: calculateConfidence(entities),
    requiresConfirmation: action ? confidence < 0.85 : false,
  };
}
```

### Tool Integration
Pixie's tools are service functions that mutate the database:

```typescript
// packages/core/src/services/pixie-tools.ts
export async function pixieAddItem(homeId: string, itemData: {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes?: string;
}) {
  // 1. Check if item exists in home; update or create
  // 2. Get current draft list; if none, create
  // 3. Add item to list with state 'pending'
  // 4. Publish WebSocket event to all home members
  // 5. Return updated list
}

export async function pixieListItems(homeId: string) {
  // Return current draft list with all items
}

export async function pixieSetRecurring(homeId: string, itemId: string, frequency: string) {
  // Create recurring_items record
  // Schedule next due date
  // Return confirmation
}
```

### Deliverables

- [ ] `packages/core/src/agent/pixie.ts` with Agent setup
- [ ] `packages/core/src/agent/intents.ts` with intent classification
- [ ] `packages/core/src/agent/entities.ts` with entity extraction
- [ ] `packages/core/src/agent/response.ts` with response validation
- [ ] `packages/core/src/services/pixie-tools.ts` with tool implementations
- [ ] Agent configuration (model, temperature, max tokens) in `.env`
- [ ] Tests: Happy path message → action flow
- [ ] Example conversation logs in `docs/pixie-examples.md`

### Acceptance Criteria
```bash
# Happy path:
POST /chat { homeId, message: "We need eggs" }
→ 200 + {
  message: "Got it! Adding a dozen eggs to your list.",
  intent: "add_item",
  entities: [{ type: 'item', value: 'eggs', confidence: 0.95 }],
  action: { type: 'add_item', payload: { name: 'eggs', quantity: 1, unit: 'dozen', ... } },
  confidence: 0.95,
  requiresConfirmation: false
}

# Requires confirmation:
POST /chat { homeId, message: "Add some stuff" }
→ 200 + { requiresConfirmation: true }

# Tool execution:
POST /chat/confirm { homeId, messageId, confirm: true }
→ 200 + { listItems: [...] }
```

---

## 5. Structured JSON Response System (Week 2, 3 days of effort)

### Objective
Ensure Pixie's AI responses are validated and safely converted to database mutations.

### Validation Pipeline

```typescript
// packages/core/src/validation/schemas.ts
import { z } from 'zod';

export const ItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().positive().default(1),
  unit: z.enum(['pack', 'dozen', 'kg', 'g', 'liter', 'ml', 'bottle', 'piece']).default('pack'),
  category: z.enum(['produce', 'dairy', 'staple', 'protein', 'household', 'other']).default('other'),
  estimatedPrice: z.number().positive().optional(),
});

export const AddItemActionSchema = z.object({
  type: z.literal('add_item'),
  payload: ItemSchema,
});

export const PixieResponseSchema = z.object({
  message: z.string(),
  intent: z.enum(['add_item', 'list_items', 'mark_purchased', 'set_recurring', 'budget_query', 'chat', 'unclear']),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  action: z.union([
    AddItemActionSchema,
    // ... other action schemas
  ]).optional(),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
});

export type PixieResponse = z.infer<typeof PixieResponseSchema>;
```

### Safe Execution

```typescript
// packages/core/src/services/pixie-executor.ts
export async function executePixieResponse(
  response: unknown,
  homeId: string,
  userId: string,
  threadId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // 1. Validate structure
    const validResponse = PixieResponseSchema.parse(response);

    // 2. Store message in DB
    await db.insert(chatMessages).values({
      threadId,
      author: 'pixie',
      content: validResponse.message,
      metadata: {
        intent: validResponse.intent,
        entities: validResponse.entities,
        confidence: validResponse.confidence,
        action: validResponse.action,
      },
    });

    // 3. Execute action if present and not requiring confirmation
    if (validResponse.action && !validResponse.requiresConfirmation) {
      return await executeAction(validResponse.action, homeId);
    }

    return { success: true };
  } catch (error) {
    // Log validation error; return safe response
    console.error('Pixie response validation failed:', error);
    return { success: false, error: 'Invalid response structure' };
  }
}

async function executeAction(action: PixieResponse['action'], homeId: string) {
  if (action?.type === 'add_item') {
    return await pixieAddItem(homeId, action.payload);
  }
  // ... other action types
}
```

### Deliverables

- [ ] Zod schemas for all Pixie response types
- [ ] Validation middleware for API responses
- [ ] `executePixieResponse` function with error handling
- [ ] Tests: Valid + invalid response structures

---

## 6. WebSocket Infrastructure (Week 2-3, 6 days of effort)

### Objective
Set up real-time synchronization for multi-user grocery list coordination. Each home gets its own WebSocket room.

### Architecture

```
User A (Browser)  → WebSocket → Server → Redis Pub/Sub → User B (Browser)
                     Room: home-123
```

#### Server Setup

```typescript
// packages/core/src/websocket/server.ts
import { Elysia } from 'elysia';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia()
  .use(websocket());

// Track connected clients per home
const homeRooms = new Map<string, Set<string>>();

app.ws('/ws/:homeId', {
  open(ws) {
    const homeId = ws.data.params.homeId;
    const userId = ws.data.user.sub; // From JWT middleware

    if (!homeRooms.has(homeId)) {
      homeRooms.set(homeId, new Set());
    }
    homeRooms.get(homeId)!.add(ws.id);

    console.log(`User ${userId} joined home ${homeId}`);

    // Notify other members
    broadcastToHome(homeId, {
      type: 'user_joined',
      userId,
      timestamp: new Date(),
    });
  },

  message(ws, message: any) {
    const homeId = ws.data.params.homeId;
    const userId = ws.data.user.sub;

    switch (message.type) {
      case 'list_item_added':
      case 'list_item_purchased':
      case 'list_state_changed':
        broadcastToHome(homeId, {
          ...message,
          userId,
          timestamp: new Date(),
        });
        break;

      case 'chat_message':
        // Send to chat service
        handleChatMessage(homeId, userId, message.content);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  },

  close(ws) {
    const homeId = ws.data.params.homeId;
    const userId = ws.data.user.sub;
    homeRooms.get(homeId)?.delete(ws.id);
    console.log(`User ${userId} left home ${homeId}`);
  },
});

function broadcastToHome(homeId: string, message: any) {
  const room = homeRooms.get(homeId);
  if (!room) return;

  room.forEach(clientId => {
    // Send to each client in the room
    // (Implementation depends on WebSocket library)
  });
}
```

#### Client Setup (TypeScript SDK pattern)

```typescript
// packages/sdk/src/websocket/client.ts
export class WebSocketClient {
  private ws?: WebSocket;
  private homeId: string;
  private token: string;
  private listeners = new Map<string, Function[]>();

  constructor(homeId: string, token: string, wsUrl: string = process.env.WS_URL!) {
    this.homeId = homeId;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(
        `${this.wsUrl}/ws/${this.homeId}?token=${this.token}`
      );

      this.ws.onopen = () => {
        console.log(`Connected to home ${this.homeId}`);
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.emit(message.type, message);
      };

      this.ws.onerror = reject;
    });
  }

  send(message: any): void {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.send(JSON.stringify(message));
  }

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

#### Message Schemas

```typescript
// packages/core/src/websocket/messages.ts
export type WebSocketMessage =
  | UserJoinedMessage
  | ListItemAddedMessage
  | ListItemPurchasedMessage
  | ListStateChangedMessage
  | ChatMessageMessage;

export interface UserJoinedMessage {
  type: 'user_joined';
  userId: string;
  timestamp: Date;
}

export interface ListItemAddedMessage {
  type: 'list_item_added';
  listId: string;
  itemId: string;
  addedBy: string;
  timestamp: Date;
}

export interface ListItemPurchasedMessage {
  type: 'list_item_purchased';
  listId: string;
  itemId: string;
  purchasedBy: string;
  timestamp: Date;
}

export interface ListStateChangedMessage {
  type: 'list_state_changed';
  listId: string;
  oldState: 'draft' | 'approved' | 'completed';
  newState: 'draft' | 'approved' | 'completed';
  timestamp: Date;
}

export interface ChatMessageMessage {
  type: 'chat_message';
  threadId: string;
  messageId: string;
  author: 'user' | 'pixie';
  content: string;
  timestamp: Date;
}
```

### Conflict Resolution (Phase 1+)
For now, last-write-wins. In Phase 1, we'll upgrade to CRDT or vector clocks for offline sync.

### Deliverables

- [ ] WebSocket server endpoint `/ws/:homeId` with auth
- [ ] Room management (tracking connected clients)
- [ ] Message broadcast pipeline
- [ ] WebSocket client library in SDK
- [ ] Message schema types
- [ ] Load test: 10+ homes, 2+ users per home
- [ ] Latency SLA: <500ms (99th percentile)

### Acceptance Criteria
```
1. User A connects to home-123
2. User B connects to home-123
3. User A sends: { type: 'list_item_added', ... }
4. User B receives same message within 500ms
5. Server maintains room state; no message loss
6. Both users can disconnect and reconnect cleanly
```

---

## 7. Basic API Endpoints (Week 3, 5 days of effort)

### Objective
Implement CRUD endpoints for all core entities. These are the foundation for web, CLI, and SDK.

### Authentication
All endpoints require `Authorization: Bearer <token>` header and verify user membership in the home.

### Entity Endpoints

#### Users
```
POST   /users/signup           (no auth)
POST   /users/login            (no auth)
GET    /users/me               (auth)
PATCH  /users/:id              (auth, self-only)
```

#### Homes
```
POST   /homes                  (auth, creates with user as owner)
GET    /homes/:id              (auth, member-only)
PATCH  /homes/:id              (auth, owner-only)
GET    /homes/:id/members      (auth, member-only)
POST   /homes/:id/members      (auth, owner-only, invite link)
DELETE /homes/:id/members/:uid (auth, owner-only)
```

#### Items
```
POST   /homes/:id/items        (auth, member)
GET    /homes/:id/items        (auth, member)
PATCH  /homes/:id/items/:iid   (auth, member)
DELETE /homes/:id/items/:iid   (auth, member)
```

#### Grocery Lists
```
POST   /homes/:id/lists        (auth, member, creates draft)
GET    /homes/:id/lists        (auth, member, returns all lists)
GET    /homes/:id/lists/:lid   (auth, member)
PATCH  /homes/:id/lists/:lid   (auth, member, state transitions)
DELETE /homes/:id/lists/:lid   (auth, member, soft-delete)
```

#### List Items
```
POST   /homes/:id/lists/:lid/items     (auth, member)
PATCH  /homes/:id/lists/:lid/items/:iid (auth, member, state transitions)
DELETE /homes/:id/lists/:lid/items/:iid (auth, member)
```

#### Chat
```
POST   /homes/:id/threads      (auth, member, creates thread)
GET    /homes/:id/threads      (auth, member, returns all threads)
POST   /homes/:id/threads/:tid/messages (auth, member)
GET    /homes/:id/threads/:tid/messages (auth, member)
POST   /homes/:id/threads/:tid/messages/:mid/confirm (auth, member, confirm action)
```

### Example Endpoint: Add Item to List

```typescript
// POST /homes/:homeId/lists/:listId/items
app.post('/homes/:homeId/lists/:listId/items',
  async (ctx) => {
    const { homeId, listId } = ctx.params;
    const { itemId, quantity, unit } = await ctx.req.json();
    const userId = ctx.user.sub;

    // 1. Verify user is member of home
    await verifyHomeMembership(homeId, userId);

    // 2. Verify list belongs to home
    const list = await db.query.groceryLists.findFirst({
      where: (l) => and(
        eq(l.id, listId),
        eq(l.homeId, homeId)
      ),
    });
    if (!list) throw new NotFoundError('List not found');

    // 3. Verify item exists
    const item = await db.query.items.findFirst({
      where: (i) => and(
        eq(i.id, itemId),
        eq(i.homeId, homeId)
      ),
    });
    if (!item) throw new NotFoundError('Item not found');

    // 4. Add item to list
    const listItem = await db.insert(listItems).values({
      listId,
      itemId,
      state: 'pending',
      addedBy: userId,
      quantity,
      unit,
    }).returning();

    // 5. Broadcast WebSocket event
    broadcastToHome(homeId, {
      type: 'list_item_added',
      listId,
      itemId,
      addedBy: userId,
    });

    return { success: true, listItem };
  }
);
```

### Error Handling

```typescript
// packages/core/src/errors.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}
```

### Deliverables

- [ ] All CRUD endpoints as listed above
- [ ] Auth verification middleware
- [ ] Home membership checks
- [ ] Error handling (400, 401, 403, 404, 500)
- [ ] API documentation (OpenAPI/Swagger schema)
- [ ] E2E tests covering happy path + error cases
- [ ] Request/response logging for debugging

### Acceptance Criteria
```bash
# Happy path:
POST /auth/signup { email, password, name } → 200
POST /homes { name } → 200 + home
POST /homes/:id/items { name, quantity, unit } → 200 + item
POST /homes/:id/lists → 200 + list (state: draft)
POST /homes/:id/lists/:lid/items { itemId } → 200 + listItem
GET /homes/:id/lists/:lid → 200 + { items, state }

# Error cases:
POST /homes/:id/items (not member) → 403
GET /homes/:id (no auth) → 401
POST /homes/:id/lists/:lid/items (no such list) → 404
```

---

## 8. CI/CD Pipeline Setup (Week 1-2, 4 days of effort)

### Objective
Establish a GitHub Actions workflow for linting, testing, and deploying to staging on every push.

### Workflow: `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pantry_pixie_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Run tests
        run: bun run test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/pantry_pixie_test

      - name: Build
        run: bun run build

  deploy-staging:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          # TBD: Deploy to staging environment (Vercel, Railway, etc.)
          echo "Deploying to staging..."
```

### Environment Files

```bash
# .env.example (checked in)
DATABASE_URL=postgres://user:password@localhost:5432/pantry_pixie_dev
JWT_SECRET=your-secret-key-dev-only
MASTRA_API_KEY=your-key
MASTRA_MODEL=gpt-4

# .env.test (generated for CI)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantry_pixie_test
JWT_SECRET=test-secret
MASTRA_API_KEY=test-key
MASTRA_MODEL=gpt-4
```

### Deliverables

- [ ] `.github/workflows/ci.yml` with lint, test, build
- [ ] `.github/workflows/deploy.yml` for staging deployment (TBD)
- [ ] `.env.example` with all required variables
- [ ] `package.json` scripts: `lint`, `test`, `build`, `dev`
- [ ] GitHub branch protection rules (require CI to pass)

---

## 9. Open Source Repo Structure (Week 2-3, 3 days of effort)

### Objective
Set up documentation, licensing, and contribution guidelines for an open-source project.

### Files

#### LICENSE
```
MIT License (or Apache 2.0, decide)
Copyright (c) 2026 Pantry Pixie Contributors
Permission is hereby granted...
```

#### README.md
```markdown
# Pantry Pixie

An open-source domestic AI steward for household coordination.

## Quick Start

```bash
git clone https://github.com/pantry-pixie/pantry-pixie
cd pantry-pixie
bun install
bun run dev
```

## Tech Stack

- **Runtime**: Bun
- **Backend**: Elysia
- **Database**: PostgreSQL + Drizzle ORM
- **AI Agent**: Mastra.ai
- **Frontend**: React (PWA)

## Documentation

- [Architecture](docs/architecture.md)
- [Phase Plan](docs/phase-plan/)
- [API Reference](docs/api.md)
- [Development Guide](CONTRIBUTING.md)

## Status

Phase 0: Foundation (In Progress)
```

#### CONTRIBUTING.md
```markdown
# Contributing to Pantry Pixie

## Development Setup

1. Clone the repo
2. Install Bun
3. `bun install`
4. `cp .env.example .env`
5. `bun run dev`

## Code Style

- Use Biome for linting/formatting
- TypeScript strict mode
- Test coverage: >80%

## Submitting Changes

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with clear messages
4. Push to your fork
5. Open a Pull Request

## Roadmap

See [Phase Plan](docs/phase-plan/overview.md)
```

#### CODE_OF_CONDUCT.md
```markdown
# Code of Conduct

Be respectful, inclusive, and constructive. See [full CoC](CODE_OF_CONDUCT.md).
```

#### CHANGELOG.md
```markdown
# Changelog

All notable changes documented here.

## [Unreleased]

### Added
- Phase 0 foundation: monorepo, database, auth, WebSocket

## [0.0.1] - 2026-02-15

Initial framework setup
```

### Deliverables

- [ ] LICENSE (MIT or Apache 2.0)
- [ ] README.md with quick start and overview
- [ ] CONTRIBUTING.md with dev guide
- [ ] CODE_OF_CONDUCT.md
- [ ] CHANGELOG.md
- [ ] docs/ARCHITECTURE.md (system overview)
- [ ] GitHub Issues templates (feature request, bug report)
- [ ] GitHub PR template

---

## Phase 0 Acceptance Criteria (Hard Gate)

All of the following must be true to proceed to Phase 1:

### 1. Monorepo
- [ ] All 4 packages (core, sdk, cli, web) created and linked
- [ ] `bun install` succeeds with zero errors
- [ ] `bun run build` compiles all packages without errors
- [ ] `bun run lint` passes across all packages

### 2. Database
- [ ] 9 tables created (users, homes, homeMembers, items, groceryLists, listItems, chatThreads, chatMessages, recurringItems)
- [ ] All foreign keys and indexes in place
- [ ] Migration system working (`bun run db:migrate`)
- [ ] Seed script populates test data

### 3. Authentication
- [ ] `/auth/signup` and `/auth/login` endpoints working
- [ ] JWT tokens generated and verified
- [ ] Auth middleware prevents unauthorized access
- [ ] Home membership verification working

### 4. Mastra.ai Agent
- [ ] Pixie agent initialized and responding
- [ ] Intent classification working (at least 80% accuracy on test cases)
- [ ] Entity extraction working (at least 80% recall)
- [ ] Structured responses validate against schemas

### 5. WebSocket
- [ ] `/ws/:homeId` endpoint accepts connections with auth
- [ ] Messages broadcast to all clients in a room
- [ ] Latency <500ms for message delivery (99th percentile)
- [ ] Clients can connect/disconnect cleanly

### 6. API Endpoints
- [ ] All CRUD endpoints implemented and tested
- [ ] Auth verification on all protected endpoints
- [ ] Error handling returns proper status codes (401, 403, 404, etc.)
- [ ] Request/response logging functional

### 7. CI/CD
- [ ] GitHub Actions workflow passes on every push
- [ ] Tests run automatically in CI
- [ ] Code coverage visible in CI output

### 8. Open Source
- [ ] Repo is public (GitHub)
- [ ] LICENSE, README, CONTRIBUTING.md, CODE_OF_CONDUCT.md in place
- [ ] Phase plan visible in `/docs/phase-plan/`

### 9. Documentation
- [ ] API reference complete (all endpoints documented)
- [ ] Database schema diagram in docs
- [ ] Development guide covers monorepo setup

---

## Success Metrics for Phase 0

| Metric | Target | Rationale |
|--------|--------|-----------|
| Build time | <60s | Fast feedback loop for development |
| Test coverage | >80% | Confidence in core logic |
| WebSocket latency (p99) | <500ms | Acceptable for household coordination |
| Pixie intent accuracy | >80% | User experience depends on understanding |
| Time to first `bun run dev` | <10 min | Friction-free onboarding for contributors |

---

## Timeline Breakdown

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1 | Monorepo + Database | Directory structure, schema, migrations |
| 2 | Auth + Agent + WebSocket | Login, Pixie agent, real-time sync |
| 3 | API + CI/CD + Docs | Endpoints, GitHub Actions, open source structure |

---

## Risks & Mitigations (Phase 0 Specific)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Mastra.ai API learning curve | Schedule slip | Allocate 2-3 days for proof-of-concept; document everything |
| WebSocket scaling issues | Premature bottleneck | Load test with mock data; plan for redis pub/sub in Phase 2 |
| Database migration strategy | Data loss risk | Use Drizzle migrations from day 1; version schema carefully |
| TypeScript complexity | Development friction | Strict mode enforced; use zod for validation; clear type docs |

---

## Notes for the Developer

1. **Start with database schema.** Everything else depends on clean entity definitions.
2. **Mastra.ai integration is the hardest part.** Budget time for prompt engineering and function calling patterns.
3. **Test WebSocket early.** Real-time sync is core to Phase 1 UX.
4. **Make Phase 0 boring.** The foundation should be well-tested, documented, and easy to extend.
5. **Keep open-source structure from day 1.** It's easier than retrofitting it later.

---

**Phase 0 Status:** Ready to Begin
**Estimated Effort:** 17 person-days
**Team Size:** 1 full-time, 2-3 part-time (or 1 dedicated developer with async support)
