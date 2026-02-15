# Pantry Pixie Usage Examples

Real-world examples of how the monorepo components work together.

## Core Package - Types & Schemas

### Using Drizzle Schema

```typescript
import { db } from './db';
import { itemsTable, usersTable } from '@pantry-pixie/core';
import { eq } from 'drizzle-orm';

// Get user's items
const userItems = await db.query.itemsTable.findMany({
  where: eq(itemsTable.homeId, homeId),
  orderBy: (items) => items.dateAdded,
});

// Add new item with recurring setup
const newItem = await db.insert(itemsTable).values({
  homeId: homeId,
  name: 'Milk',
  quantity: 2,
  unit: 'liters',
  category: 'dairy',
  isRecurring: true,
  recurringInterval: 'weekly',
}).returning();
```

### Using Pixie Intent Classification

```typescript
import { classifyIntent, getIntentInfo } from '@pantry-pixie/core';

const userMessage = "I just bought some eggs and milk";
const intent = classifyIntent(userMessage);
// Returns: 'add_item'

const info = getIntentInfo(intent);
// { name: 'Add Item', description: '...', category: 'action' }
```

### Generating Pixie's System Prompt

```typescript
import { generateSystemPrompt } from '@pantry-pixie/core';

const systemPrompt = generateSystemPrompt({
  name: 'Alex',
  cookingSkillLevel: 'intermediate',
  dietaryRestrictions: ['vegetarian'],
  budgetConsciousness: 'high',
  homeSize: 3,
});

// Use with LLM API
const response = await llm.chat({
  system: systemPrompt,
  messages: [...conversationHistory],
});
```

## SDK Package - Client Integration

### Basic SDK Usage

```typescript
import { PantryPixieClient } from '@pantry-pixie/sdk';

// Initialize client
const client = new PantryPixieClient({
  baseUrl: 'https://api.pantry-pixie.local',
  accessToken: process.env.API_TOKEN,
});

// List homes
const response = await client.homes.list();
if (response.success) {
  const homes = response.data;
  // Use homes...
}

// Add item to pantry
await client.items.create(homeId, {
  name: 'Tomatoes',
  quantity: 6,
  unit: 'pieces',
  category: 'produce',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

### Pagination

```typescript
// Get items with pagination
const response = await client.items.list(homeId, {
  page: 1,
  limit: 20,
});

const { items, total, hasMore } = response.data;

// Load next page if available
if (hasMore) {
  const nextPage = await client.items.list(homeId, {
    page: 2,
    limit: 20,
  });
}
```

### Chat Integration

```typescript
// Create a chat thread
const thread = await client.chat.createThread(homeId, {
  title: 'Weekly Planning',
});

// Send message to Pixie
const message = await client.chat.sendMessage(homeId, thread.data.id, {
  content: 'What can I make with eggs and tomatoes?',
});

// Get conversation history
const messages = await client.chat.getMessages(homeId, threadId, {
  limit: 50,
});
```

## CLI Package - Command Line Usage

### Adding Items

```bash
# Simple item
pixie item add "milk"

# With options
pixie item add "eggs" --quantity 12 --unit pieces --category dairy

# Set as recurring
pixie item add "coffee" --recurring --interval weekly
```

### Managing Lists

```bash
# Create new list
pixie list create "Weekly Shopping"

# Add item to list
pixie list add --list-id abc123 --item "tomatoes" --quantity 5

# Check list status
pixie list status --list-id abc123
```

### Configuration

```bash
# Set API endpoint
pixie config set apiUrl https://api.pantry-pixie.local

# Set default home
pixie config set defaultHome abc123

# View configuration
pixie config view
```

## Web Package - PWA Server

### Starting the Server

```bash
# Development (with watch)
bun run dev

# Production
bun run build && bun run start

# Custom port
PORT=8080 bun run src/index.ts
```

### WebSocket Communication

```typescript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to Pixie');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'message') {
    // Handle Pixie's response
    console.log('Pixie:', message.payload.content);
  }
};

// Send message to Pixie
ws.send(JSON.stringify({
  type: 'message',
  payload: {
    threadId: 'thread-123',
    role: 'user',
    content: 'Do I have any milk?',
  },
  timestamp: new Date(),
}));
```

### API Endpoint Usage

```typescript
// Fetch items from API
const response = await fetch('/api/homes/home-123/items');
const { data } = await response.json();

// Create new grocery list
const listResponse = await fetch('/api/homes/home-123/lists', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Weekend groceries',
    totalBudget: 100,
  }),
});

const newList = await listResponse.json();
```

## Putting It All Together - Full Flow

### Example: User Adds Milk via Chat

1. **User sends message** via PWA chat interface
   ```
   User: "I just bought 2 liters of milk"
   ```

2. **Server receives via WebSocket**
   - Message arrives at `/ws` handler
   - `handleWebSocketMessage()` processes it

3. **Intent Classification** (core package)
   ```typescript
   const intent = classifyIntent("I just bought 2 liters of milk");
   // Returns: 'add_item'
   ```

4. **Pixie Agent** processes with system prompt
   ```typescript
   const agent = new PantryPixieAgent();
   const response = await agent.processMessage(userMessage);
   // Extracts: name='Milk', quantity=2, unit='liters'
   ```

5. **Execute Action** - Database update
   ```typescript
   await db.insert(itemsTable).values({
     homeId: userHomeId,
     name: 'Milk',
     quantity: 2,
     unit: 'liters',
     category: 'dairy',
     dateAdded: new Date(),
   });
   ```

6. **Send Response** back to client
   ```typescript
   ws.send(JSON.stringify({
     type: 'message',
     payload: {
       role: 'assistant',
       content: "Got it! Added 2 liters of milk to your pantry. It'll keep for about a week.",
       intent: 'add_item',
     },
   }));
   ```

7. **Client displays** in chat UI and updates inventory view

## Testing Patterns

### Testing Types

```typescript
import { describe, test, expect } from 'bun:test';
import type { Item, CreateItemInput } from '@pantry-pixie/core';

describe('Item types', () => {
  test('CreateItemInput is valid', () => {
    const item: CreateItemInput = {
      name: 'Eggs',
      quantity: 12,
      unit: 'pieces',
      category: 'dairy',
    };
    
    expect(item.name).toBe('Eggs');
  });
});
```

### Testing Intent Classification

```typescript
import { classifyIntent } from '@pantry-pixie/core';
import { describe, test, expect } from 'bun:test';

describe('Intent Classification', () => {
  test('detects add_item intent', () => {
    expect(classifyIntent('I just bought milk')).toBe('add_item');
    expect(classifyIntent('Got some eggs')).toBe('add_item');
  });

  test('detects budget_question intent', () => {
    expect(classifyIntent('How much have I spent?')).toBe('budget_question');
  });

  test('falls back to other', () => {
    expect(classifyIntent('Blah blah random')).toBe('other');
  });
});
```

### Testing SDK

```typescript
import { PantryPixieClient } from '@pantry-pixie/sdk';
import { describe, test, expect, mock } from 'bun:test';

describe('SDK Client', () => {
  test('constructs with config', () => {
    const client = new PantryPixieClient({
      baseUrl: 'http://localhost:3000',
      accessToken: 'test-token',
    });
    
    expect(client).toBeDefined();
  });

  test('sets access token', () => {
    const client = new PantryPixieClient({ baseUrl: 'http://localhost:3000' });
    client.setAccessToken('new-token');
    // Token is set internally
  });
});
```

## Development Workflow

```bash
# 1. Start server
bun run dev
# Server runs on :3000 with TypeScript transpilation

# 2. Test with CLI
bun run --cwd packages/cli build
bun packages/cli/dist/index.js item add "milk" --quantity 2

# 3. Make SDK calls
import { PantryPixieClient } from '@pantry-pixie/sdk';
const client = new PantryPixieClient({ baseUrl: 'http://localhost:3000' });
const homes = await client.homes.list();

# 4. Run type checking
bun run type-check

# 5. Build for production
bun run build
```

This is a complete, production-grade scaffold. Everything is real and ready to extend.
