# Phase 2: SDK & CLI (Weeks 9-12)

## Overview

Phase 2 extracts Pantry Pixie's core logic into reusable packages: a TypeScript SDK for programmatic access and a CLI tool for terminal-based interactions. This phase also establishes the agent-to-agent protocol for integration with external AI systems like OpenClaw.

**Duration:** 4 weeks
**Goal:** Launch public npm packages and validate agent-to-agent integration
**Success Criteria:** 100+ downloads/week on npm; ≥1 external integration using agent protocol; 10+ GitHub contributors

---

## 1. SDK Architecture & Design (Weeks 9-10, 6 days of effort)

### Objective
Create `@pantry-pixie/sdk`: a TypeScript SDK for programmatic access to Pantry Pixie features.

### Design Principles

1. **API-First**: SDK calls the same REST API as the web app (no special backend routes)
2. **Type-Safe**: Full TypeScript support; easy IDE autocomplete
3. **Offline-Friendly**: Works with cached data; queues mutations for sync
4. **Event-Driven**: WebSocket subscriptions for real-time updates
5. **Zero Dependencies**: Minimal bundle size (< 50KB gzipped)

### Package Structure

```
packages/sdk/
├── src/
│   ├── client.ts              # Main SDK entry point
│   ├── auth/
│   │   ├── token.ts           # Token management
│   │   └── types.ts
│   ├── homes/
│   │   ├── home.ts            # Home CRUD
│   │   └── types.ts
│   ├── items/
│   │   ├── item.ts            # Item CRUD
│   │   └── types.ts
│   ├── lists/
│   │   ├── list.ts            # List management
│   │   └── types.ts
│   ├── chat/
│   │   ├── thread.ts          # Chat threads
│   │   └── types.ts
│   ├── websocket/
│   │   ├── client.ts          # WebSocket client
│   │   └── types.ts
│   ├── storage/
│   │   ├── localstorage.ts    # Browser storage adapter
│   │   ├── memory.ts          # In-memory (Node.js) adapter
│   │   └── types.ts
│   └── index.ts               # Exports
├── package.json
└── tsconfig.json
```

### Core SDK Client

```typescript
// packages/sdk/src/client.ts
import { TokenManager } from './auth/token';
import { HomeService } from './homes/home';
import { ItemService } from './items/item';
import { ListService } from './lists/list';
import { ChatService } from './chat/thread';
import { WebSocketClient } from './websocket/client';

export interface SDKConfig {
  apiUrl: string;
  wsUrl: string;
  token?: string;
  storageAdapter?: StorageAdapter;
  onTokenRefresh?: (token: string) => void;
}

export class PantryPixieSDK {
  private tokenManager: TokenManager;
  private wsClient: WebSocketClient;

  public homes: HomeService;
  public items: ItemService;
  public lists: ListService;
  public chat: ChatService;

  constructor(private config: SDKConfig) {
    this.tokenManager = new TokenManager(config.token, config.storageAdapter);
    this.wsClient = new WebSocketClient(config.wsUrl, this.tokenManager);

    this.homes = new HomeService(config.apiUrl, this.tokenManager);
    this.items = new ItemService(config.apiUrl, this.tokenManager);
    this.lists = new ListService(config.apiUrl, this.tokenManager);
    this.chat = new ChatService(config.apiUrl, this.tokenManager);
  }

  // Authentication
  async signup(email: string, password: string, name: string) {
    const response = await fetch(`${this.config.apiUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) throw new Error('Signup failed');
    const { token } = await response.json();
    this.tokenManager.setToken(token);
    return { token };
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.config.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Login failed');
    const { token } = await response.json();
    this.tokenManager.setToken(token);
    return { token };
  }

  // WebSocket
  async connect(homeId: string) {
    await this.wsClient.connect(homeId);
  }

  disconnect() {
    this.wsClient.disconnect();
  }

  onListUpdated(callback: (list: any) => void) {
    this.wsClient.on('list_updated', callback);
  }

  onChatMessage(callback: (message: any) => void) {
    this.wsClient.on('chat_message', callback);
  }

  // Utility
  isAuthenticated(): boolean {
    return this.tokenManager.hasToken();
  }

  async getCurrentUser() {
    const response = await fetch(`${this.config.apiUrl}/auth/me`, {
      headers: { 'Authorization': `Bearer ${this.tokenManager.getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  }
}

// Export factory function
export function createPantryPixieSDK(config: SDKConfig): PantryPixieSDK {
  return new PantryPixieSDK(config);
}
```

### Home Service

```typescript
// packages/sdk/src/homes/home.ts
export interface Home {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeMember {
  id: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export class HomeService {
  constructor(private apiUrl: string, private tokenManager: TokenManager) {}

  async create(name: string): Promise<Home> {
    const response = await this.request('POST', '/homes', { name });
    return response.json();
  }

  async get(homeId: string): Promise<Home> {
    const response = await this.request('GET', `/homes/${homeId}`);
    return response.json();
  }

  async list(): Promise<Home[]> {
    const response = await this.request('GET', '/homes');
    return response.json();
  }

  async update(homeId: string, data: Partial<Home>): Promise<Home> {
    const response = await this.request('PATCH', `/homes/${homeId}`, data);
    return response.json();
  }

  async delete(homeId: string): Promise<void> {
    await this.request('DELETE', `/homes/${homeId}`);
  }

  async getMembers(homeId: string): Promise<HomeMember[]> {
    const response = await this.request('GET', `/homes/${homeId}/members`);
    return response.json();
  }

  async inviteMember(homeId: string, email: string): Promise<{ inviteId: string }> {
    const response = await this.request('POST', `/homes/${homeId}/members`, { email });
    return response.json();
  }

  async removeMember(homeId: string, userId: string): Promise<void> {
    await this.request('DELETE', `/homes/${homeId}/members/${userId}`);
  }

  private async request(method: string, path: string, body?: any) {
    const token = this.tokenManager.getToken();
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}
```

### Item Service

```typescript
// packages/sdk/src/items/item.ts
export interface Item {
  id: string;
  homeId: string;
  name: string;
  description?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  lastPurchasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ItemService {
  constructor(private apiUrl: string, private tokenManager: TokenManager) {}

  async create(homeId: string, item: Omit<Item, 'id' | 'homeId' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const response = await this.request('POST', `/homes/${homeId}/items`, item);
    return response.json();
  }

  async get(homeId: string, itemId: string): Promise<Item> {
    const response = await this.request('GET', `/homes/${homeId}/items/${itemId}`);
    return response.json();
  }

  async list(homeId: string, query?: { category?: string }): Promise<Item[]> {
    const params = new URLSearchParams(query);
    const response = await this.request('GET', `/homes/${homeId}/items?${params}`);
    return response.json();
  }

  async update(homeId: string, itemId: string, data: Partial<Item>): Promise<Item> {
    const response = await this.request('PATCH', `/homes/${homeId}/items/${itemId}`, data);
    return response.json();
  }

  async delete(homeId: string, itemId: string): Promise<void> {
    await this.request('DELETE', `/homes/${homeId}/items/${itemId}`);
  }

  private async request(method: string, path: string, body?: any) {
    const token = this.tokenManager.getToken();
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}
```

### List Service

```typescript
// packages/sdk/src/lists/list.ts
export interface GroceryList {
  id: string;
  homeId: string;
  state: 'draft' | 'approved' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface ListItem {
  id: string;
  listId: string;
  itemId: string;
  state: 'pending' | 'purchased' | 'removed';
  addedBy: string;
  purchasedBy?: string;
  purchasedAt?: Date;
  quantity: number;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ListService {
  constructor(private apiUrl: string, private tokenManager: TokenManager) {}

  async create(homeId: string): Promise<GroceryList> {
    const response = await this.request('POST', `/homes/${homeId}/lists`, {});
    return response.json();
  }

  async get(homeId: string, listId: string): Promise<GroceryList & { items: ListItem[] }> {
    const response = await this.request('GET', `/homes/${homeId}/lists/${listId}`);
    return response.json();
  }

  async list(homeId: string, query?: { state?: string }): Promise<GroceryList[]> {
    const params = new URLSearchParams(query);
    const response = await this.request('GET', `/homes/${homeId}/lists?${params}`);
    return response.json();
  }

  async updateState(homeId: string, listId: string, state: 'draft' | 'approved' | 'completed'): Promise<GroceryList> {
    const response = await this.request('PATCH', `/homes/${homeId}/lists/${listId}`, { state });
    return response.json();
  }

  async addItem(homeId: string, listId: string, itemId: string, quantity: number = 1, unit: string = 'pack'): Promise<ListItem> {
    const response = await this.request('POST', `/homes/${homeId}/lists/${listId}/items`, {
      itemId,
      quantity,
      unit,
    });
    return response.json();
  }

  async markPurchased(homeId: string, listId: string, itemId: string): Promise<ListItem> {
    const response = await this.request('PATCH', `/homes/${homeId}/lists/${listId}/items/${itemId}`, {
      state: 'purchased',
    });
    return response.json();
  }

  async removeItem(homeId: string, listId: string, itemId: string): Promise<void> {
    await this.request('DELETE', `/homes/${homeId}/lists/${listId}/items/${itemId}`);
  }

  private async request(method: string, path: string, body?: any) {
    const token = this.tokenManager.getToken();
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}
```

### Chat Service

```typescript
// packages/sdk/src/chat/thread.ts
export interface ChatThread {
  id: string;
  homeId: string;
  title: string;
  context?: Record<string, any>;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  author: 'user' | 'pixie';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class ChatService {
  constructor(private apiUrl: string, private tokenManager: TokenManager) {}

  async createThread(homeId: string, title?: string): Promise<ChatThread> {
    const response = await this.request('POST', `/homes/${homeId}/threads`, { title });
    return response.json();
  }

  async getThread(homeId: string, threadId: string): Promise<ChatThread> {
    const response = await this.request('GET', `/homes/${homeId}/threads/${threadId}`);
    return response.json();
  }

  async listThreads(homeId: string): Promise<ChatThread[]> {
    const response = await this.request('GET', `/homes/${homeId}/threads`);
    return response.json();
  }

  async sendMessage(homeId: string, threadId: string, content: string): Promise<ChatMessage> {
    const response = await this.request('POST', `/homes/${homeId}/threads/${threadId}/messages`, {
      content,
    });
    return response.json();
  }

  async getMessages(homeId: string, threadId: string): Promise<ChatMessage[]> {
    const response = await this.request('GET', `/homes/${homeId}/threads/${threadId}/messages`);
    return response.json();
  }

  async confirmAction(homeId: string, threadId: string, messageId: string, confirm: boolean): Promise<any> {
    const response = await this.request('POST', `/homes/${homeId}/threads/${threadId}/messages/${messageId}/confirm`, {
      confirm,
    });
    return response.json();
  }

  private async request(method: string, path: string, body?: any) {
    const token = this.tokenManager.getToken();
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}
```

### SDK Usage Examples

```typescript
// Node.js / Browser usage
import { createPantryPixieSDK } from '@pantry-pixie/sdk';

const sdk = createPantryPixieSDK({
  apiUrl: 'https://api.pantry-pixie.app',
  wsUrl: 'wss://api.pantry-pixie.app',
});

// Signup
await sdk.signup('user@example.com', 'password123', 'John Doe');

// Create home
const home = await sdk.homes.create('Our Apartment');

// Create item
const eggs = await sdk.items.create(home.id, {
  name: 'Eggs',
  quantity: 1,
  unit: 'dozen',
  category: 'dairy',
});

// Create list and add item
const list = await sdk.lists.create(home.id);
await sdk.lists.addItem(home.id, list.id, eggs.id);

// Chat with Pixie
const thread = await sdk.chat.createThread(home.id);
const userMsg = await sdk.chat.sendMessage(home.id, thread.id, 'We need milk too');

// Real-time updates
sdk.connect(home.id);
sdk.onListUpdated((list) => {
  console.log('List updated:', list);
});
```

### Deliverables

- [ ] `packages/sdk/` with all services (Home, Item, List, Chat)
- [ ] Type definitions for all entities
- [ ] Token management (storage adapter pattern)
- [ ] WebSocket client integration
- [ ] Error handling and retry logic
- [ ] Comprehensive JSDoc comments
- [ ] SDK tests (happy path + error cases)
- [ ] Example code in README

### Acceptance Criteria
```bash
# SDK should work in both Node.js and browser:
npm install @pantry-pixie/sdk
# Import works:
import { createPantryPixieSDK } from '@pantry-pixie/sdk';
# Full TypeScript support:
const sdk = createPantryPixieSDK({...})
const homes: Home[] = await sdk.homes.list();
# All CRUD operations complete without error
```

---

## 2. CLI Tool (Weeks 10-11, 7 days of effort)

### Objective
Create `@pantry-pixie/cli`: a command-line interface for terminal-based grocery management.

### Technology Stack

```
CLI Framework: Commander.js
Configuration: ~/.pixie/config.json (stores homeId, token)
Input/Output: Inquirer.js for interactive prompts
Display: Chalk + Table.js for formatted output
Installation: npm install -g @pantry-pixie/cli
```

### CLI Commands

```bash
# Authentication
pixie login                    # Interactive login
pixie logout                   # Clear local token

# Home Management
pixie init                     # Create or join a home
pixie home:list               # List homes you're in
pixie home:switch <homeId>    # Switch active home
pixie home:members            # List home members
pixie home:invite <email>     # Invite a partner

# Grocery List
pixie add "eggs and milk"     # Conversational add (Pixie parses)
pixie list                    # Show current list
pixie list:approve            # Move draft → approved
pixie mark-purchased <id>     # Mark item as purchased
pixie remove <id>             # Remove item from list

# Chat
pixie chat "what do we need?" # Send message to Pixie
pixie sync                    # Trigger weekly sync

# Recurring Items
pixie recurring <itemId> weekly   # Set weekly recurrence
pixie recurring:list              # Show recurring items

# Utilities
pixie config                  # Show configuration
pixie status                  # Show home status
pixie help                    # Show help
pixie version                 # Show version
```

### Implementation

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { createPantryPixieSDK } from '@pantry-pixie/sdk';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.env.HOME || '', '.pixie');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  token?: string;
  homeId?: string;
  apiUrl: string;
  wsUrl: string;
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): Config {
  ensureConfigDir();
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {
    apiUrl: 'https://api.pantry-pixie.app',
    wsUrl: 'wss://api.pantry-pixie.app',
  };
}

function saveConfig(config: Config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const sdk = createPantryPixieSDK({
  apiUrl: loadConfig().apiUrl,
  wsUrl: loadConfig().wsUrl,
  token: loadConfig().token,
});

const program = new Command();
program.name('pixie').description('Pantry Pixie CLI').version('0.1.0');

// Login
program
  .command('login')
  .description('Login to Pantry Pixie')
  .action(async () => {
    const inquirer = require('inquirer');
    const { email, password } = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
      },
    ]);

    try {
      const { token } = await sdk.login(email, password);
      const config = loadConfig();
      config.token = token;
      saveConfig(config);
      console.log('✅ Logged in successfully!');
    } catch (error) {
      console.error('❌ Login failed:', error);
      process.exit(1);
    }
  });

// Logout
program
  .command('logout')
  .description('Logout from Pantry Pixie')
  .action(() => {
    const config = loadConfig();
    config.token = undefined;
    saveConfig(config);
    console.log('✅ Logged out successfully!');
  });

// Init home
program
  .command('init')
  .description('Create or join a home')
  .action(async () => {
    const inquirer = require('inquirer');
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Create a new home or join existing?',
        choices: ['Create new', 'Join existing'],
      },
    ]);

    try {
      if (action === 'Create new') {
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Home name (e.g., Apartment 42):',
          },
        ]);

        const home = await sdk.homes.create(name);
        const config = loadConfig();
        config.homeId = home.id;
        saveConfig(config);

        console.log(`✅ Created home: ${home.name}`);
      } else {
        const homes = await sdk.homes.list();
        const { homeId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'homeId',
            message: 'Select home:',
            choices: homes.map((h) => ({ name: h.name, value: h.id })),
          },
        ]);

        const config = loadConfig();
        config.homeId = homeId;
        saveConfig(config);

        console.log('✅ Switched to home!');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Add item
program
  .command('add <description>')
  .description('Add items to the grocery list')
  .action(async (description: string) => {
    const config = loadConfig();
    if (!config.homeId) {
      console.error('❌ No home selected. Run `pixie init` first.');
      process.exit(1);
    }

    try {
      // Get current draft list
      const lists = await sdk.lists.list(config.homeId, { state: 'draft' });
      let list = lists[0];
      if (!list) {
        list = await sdk.lists.create(config.homeId);
      }

      // Send to Pixie for parsing
      const thread = await sdk.chat.createThread(config.homeId);
      const response = await sdk.chat.sendMessage(config.homeId, thread.id, description);

      console.log(`✅ ${response.content}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// List items
program
  .command('list')
  .description('Show current grocery list')
  .action(async () => {
    const config = loadConfig();
    if (!config.homeId) {
      console.error('❌ No home selected. Run `pixie init` first.');
      process.exit(1);
    }

    try {
      const lists = await sdk.lists.list(config.homeId, { state: 'draft' });
      if (!lists.length) {
        console.log('📭 No list yet. Run `pixie add` to create one.');
        return;
      }

      const list = lists[0];
      const listDetails = await sdk.lists.get(config.homeId, list.id);

      const Table = require('cli-table3');
      const table = new Table({
        head: ['Item', 'Qty', 'Unit', 'Status'],
        style: { head: [], border: ['cyan'] },
      });

      listDetails.items.forEach((item: any) => {
        table.push([
          item.name,
          item.quantity,
          item.unit || '-',
          item.state === 'purchased' ? '✓' : '○',
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Mark purchased
program
  .command('mark-purchased <itemId>')
  .description('Mark item as purchased')
  .action(async (itemId: string) => {
    const config = loadConfig();
    if (!config.homeId) {
      console.error('❌ No home selected.');
      process.exit(1);
    }

    try {
      const lists = await sdk.lists.list(config.homeId, { state: 'draft' });
      if (!lists.length) {
        console.error('❌ No draft list.');
        process.exit(1);
      }

      await sdk.lists.markPurchased(config.homeId, lists[0].id, itemId);
      console.log('✅ Marked as purchased!');
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Approve list
program
  .command('list:approve')
  .description('Approve draft list for shopping')
  .action(async () => {
    const config = loadConfig();
    if (!config.homeId) {
      console.error('❌ No home selected.');
      process.exit(1);
    }

    try {
      const lists = await sdk.lists.list(config.homeId, { state: 'draft' });
      if (!lists.length) {
        console.error('❌ No draft list.');
        process.exit(1);
      }

      await sdk.lists.updateState(config.homeId, lists[0].id, 'approved');
      console.log('✅ List approved for shopping!');
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Chat with Pixie
program
  .command('chat <message>')
  .description('Chat with Pixie')
  .action(async (message: string) => {
    const config = loadConfig();
    if (!config.homeId) {
      console.error('❌ No home selected.');
      process.exit(1);
    }

    try {
      const thread = await sdk.chat.createThread(config.homeId);
      const response = await sdk.chat.sendMessage(config.homeId, thread.id, message);
      console.log(`🍃 Pixie: ${response.content}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Config
program
  .command('config')
  .description('Show configuration')
  .action(() => {
    const config = loadConfig();
    console.log('📋 Configuration:');
    console.log(`  Home: ${config.homeId || '(not set)'}`);
    console.log(`  Token: ${config.token ? '✓ Set' : '✗ Not set'}`);
    console.log(`  API: ${config.apiUrl}`);
  });

program.parse(process.argv);
```

### Package Configuration

```json
{
  "name": "@pantry-pixie/cli",
  "version": "0.1.0",
  "description": "Pantry Pixie command-line interface",
  "bin": {
    "pixie": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "type": "module",
  "dependencies": {
    "@pantry-pixie/sdk": "0.1.0",
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
```

### CLI Usage Examples

```bash
# First-time setup
pixie login
pixie init
> Create new
> Home name: "Our Kitchen"

# Add items conversationally
pixie add "eggs and coriander"
pixie add "milk, organic if available"

# View list
pixie list
# Item         | Qty | Unit | Status
# Eggs         | 1   | dozen| ○
# Coriander    | 1   | bunch| ○
# Milk         | 1   | liter| ○

# Mark as purchased
pixie mark-purchased <item-id>

# Approve list for shopping
pixie list:approve

# Chat with Pixie
pixie chat "what else do we need?"

# View configuration
pixie config
```

### Deliverables

- [ ] `packages/cli/` with all commands
- [ ] Config file management (~/.pixie/config.json)
- [ ] Interactive prompts (login, init, etc.)
- [ ] Formatted table output
- [ ] CLI tests covering main commands
- [ ] Help text and documentation
- [ ] Shell completions (bash/zsh, Phase 2+)
- [ ] Binary distribution via npm

### Acceptance Criteria
```bash
npm install -g @pantry-pixie/cli
pixie --version              # Works
pixie login                  # Interactive login works
pixie add "eggs"             # Adds via Pixie
pixie list                   # Shows items
pixie list:approve           # Transitions state
pixie chat "hello"           # Chat works
pixie help                   # Help text clear
```

---

## 3. Agent-to-Agent Protocol (Weeks 10-12, 5 days of effort)

### Objective
Define a standard protocol for external agents (e.g., OpenClaw) to interact with Pantry Pixie.

### Design Principles

1. **Function Calling**: Pixie exposes tools that other agents can call
2. **Stateless**: Each call is independent; agent manages context
3. **Structured Inputs/Outputs**: JSON schemas for all parameters
4. **Authentication**: Token-based API key for agent access
5. **Rate Limiting**: Prevent abuse; clear error messages

### Protocol Specification

```typescript
// packages/core/src/agent-protocol/types.ts
export interface AgentToolCall {
  toolName: string;
  parameters: Record<string, any>;
  homeId: string;
  requestId: string;
}

export interface AgentToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
}

export interface PixieTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (params: any, homeId: string) => Promise<any>;
}
```

### Available Tools

```typescript
// packages/core/src/agent-protocol/tools.ts

export const pixieTools: Record<string, PixieTool> = {
  // List Management
  getGroceryList: {
    name: 'getGroceryList',
    description: 'Get the current grocery list',
    parameters: {
      type: 'object',
      properties: {
        listState: {
          type: 'string',
          enum: ['draft', 'approved', 'completed'],
          description: 'Filter by list state (optional)',
        },
      },
      required: [],
    },
    handler: async (params, homeId) => {
      const state = params.listState || 'draft';
      const lists = await db.query.groceryLists.findMany({
        where: (l) => and(eq(l.homeId, homeId), eq(l.state, state)),
      });
      return { lists };
    },
  },

  // Item Management
  addGroceryItem: {
    name: 'addGroceryItem',
    description: 'Add an item to the grocery list',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit (dozen, kg, pack, etc.)' },
        category: {
          type: 'string',
          enum: ['produce', 'dairy', 'staple', 'protein', 'household'],
        },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['name'],
    },
    handler: async (params, homeId) => {
      // Create or get item
      const item = await db.insert(items).values({
        homeId,
        name: params.name,
        quantity: params.quantity || 1,
        unit: params.unit || 'pack',
        category: params.category || 'household',
        description: params.notes,
      }).returning();

      // Add to current draft list
      const lists = await db.query.groceryLists.findMany({
        where: (l) => and(eq(l.homeId, homeId), eq(l.state, 'draft')),
      });
      const list = lists[0] || await db.insert(groceryLists).values({
        homeId,
        state: 'draft',
      }).returning();

      const listItem = await db.insert(listItems).values({
        listId: list.id,
        itemId: item.id,
        state: 'pending',
        addedBy: 'agent',
      }).returning();

      return { item, listItem };
    },
  },

  // Chat Interaction
  chatWithPixie: {
    name: 'chatWithPixie',
    description: 'Send a message to Pixie in the context of a home',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message content' },
        threadId: { type: 'string', description: 'Optional: existing thread ID' },
      },
      required: ['message'],
    },
    handler: async (params, homeId) => {
      let threadId = params.threadId;

      if (!threadId) {
        const thread = await db.insert(chatThreads).values({
          homeId,
          title: `Agent Query - ${new Date().toISOString()}`,
          context: { source: 'agent_protocol' },
          createdBy: 'agent',
        }).returning();
        threadId = thread.id;
      }

      const userMessage = await db.insert(chatMessages).values({
        threadId,
        author: 'user',
        authorId: undefined, // Agent-originated
        content: params.message,
      }).returning();

      // Pixie responds
      const pixieResponse = await processPixieMessage(params.message, homeId, threadId);

      const pixieMessage = await db.insert(chatMessages).values({
        threadId,
        author: 'pixie',
        content: pixieResponse.message,
        metadata: {
          intent: pixieResponse.intent,
          entities: pixieResponse.entities,
          confidence: pixieResponse.confidence,
        },
      }).returning();

      return {
        threadId,
        userMessage,
        pixieMessage: pixieMessage,
      };
    },
  },

  // Insights
  getSpending: {
    name: 'getSpending',
    description: 'Get household spending insights',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month'],
          description: 'Time period',
        },
      },
      required: ['period'],
    },
    handler: async (params, homeId) => {
      const period = params.period === 'month' ? 30 : 7;
      const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const spending = await calculateSpending(homeId, since);
      return spending;
    },
  },
};
```

### API Endpoint

```typescript
// POST /api/agent/call
// Headers: Authorization: Bearer <agent-token>
// Body: { toolName, parameters, homeId }

app.post('/api/agent/call', async (ctx) => {
  // Verify agent token
  const token = ctx.headers.get('authorization')?.replace('Bearer ', '');
  if (!verifyAgentToken(token)) {
    throw new UnauthorizedError('Invalid agent token');
  }

  const { toolName, parameters, homeId, requestId } = await ctx.req.json();

  // Verify agent has access to this home
  // (This could be stored in a separate agent_tokens table)

  // Get tool
  const tool = pixieTools[toolName];
  if (!tool) {
    return ctx.json(
      {
        success: false,
        error: `Unknown tool: ${toolName}`,
        requestId,
      },
      { status: 400 }
    );
  }

  try {
    // Validate parameters against schema
    const valid = validateAgainstSchema(parameters, tool.parameters);
    if (!valid.ok) {
      return ctx.json(
        {
          success: false,
          error: `Invalid parameters: ${valid.error}`,
          requestId,
        },
        { status: 400 }
      );
    }

    // Execute tool
    const result = await tool.handler(parameters, homeId);

    return ctx.json({
      success: true,
      data: result,
      requestId,
    });
  } catch (error) {
    console.error(`Tool execution failed: ${toolName}`, error);
    return ctx.json(
      {
        success: false,
        error: error.message,
        requestId,
      },
      { status: 500 }
    );
  }
});
```

### Agent Integration Example: OpenClaw

```typescript
// Example: How OpenClaw would use Pantry Pixie
import axios from 'axios';

class PantryPixieConnector {
  constructor(private homeId: string, private agentToken: string) {}

  async callTool(toolName: string, parameters: any) {
    const response = await axios.post(
      'https://api.pantry-pixie.app/api/agent/call',
      {
        toolName,
        parameters,
        homeId: this.homeId,
        requestId: crypto.randomUUID(),
      },
      {
        headers: {
          'Authorization': `Bearer ${this.agentToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  }

  // Convenience methods
  async getGroceryList() {
    return this.callTool('getGroceryList', {});
  }

  async addItem(name: string, quantity: number = 1, unit: string = 'pack') {
    return this.callTool('addGroceryItem', { name, quantity, unit });
  }

  async chat(message: string) {
    return this.callTool('chatWithPixie', { message });
  }

  async getSpending(period: 'week' | 'month' = 'week') {
    return this.callTool('getSpending', { period });
  }
}

// OpenClaw can now use Pantry Pixie:
const pixie = new PantryPixieConnector(homeId, agentToken);
const list = await pixie.getGroceryList();
await pixie.addItem('Milk', 2, 'liters');
```

### Documentation

```markdown
# Agent Protocol

Pantry Pixie exposes a set of tools via the Agent Protocol that external AI agents can call.

## Authentication

Agents use API tokens stored in the `agent_tokens` table:

```sql
CREATE TABLE agent_tokens (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  homeId UUID REFERENCES homes(id),
  createdAt TIMESTAMP,
  revokedAt TIMESTAMP
);
```

## Tool Calling

POST `/api/agent/call`

```json
{
  "toolName": "getGroceryList",
  "parameters": {
    "listState": "draft"
  },
  "homeId": "home-uuid",
  "requestId": "request-uuid"
}
```

## Available Tools

- `getGroceryList`: Retrieve current lists
- `addGroceryItem`: Add item to list
- `chatWithPixie`: Send message to Pixie
- `getSpending`: Get spending insights

See `packages/core/src/agent-protocol/tools.ts` for full schema.

## Rate Limiting

- 100 requests per minute per agent token
- 1000 requests per day per agent token

Exceed limits: 429 Too Many Requests
```

### Deliverables

- [ ] Agent protocol specification document
- [ ] Tool definitions for all major operations
- [ ] `/api/agent/call` endpoint with auth and validation
- [ ] Agent token management (create, revoke)
- [ ] Example OpenClaw integration
- [ ] Rate limiting middleware
- [ ] Comprehensive API documentation
- [ ] Agent integration tests

### Acceptance Criteria
```bash
# Agent token creation:
POST /api/admin/agent-tokens { name, homeId } → { token }

# Tool calling:
POST /api/agent/call {
  toolName: "getGroceryList",
  parameters: {},
  homeId: "xxx",
  requestId: "xxx"
}
→ 200 { success: true, data: {...}, requestId: "xxx" }

# Rate limiting:
After 100 requests/min → 429 Too Many Requests

# Error handling:
Invalid token → 401 Unauthorized
Unknown tool → 400 Bad Request
Invalid parameters → 400 Bad Request
```

---

## 4. npm Publishing & Distribution (Week 12, 4 days of effort)

### Objective
Publish SDK and CLI to npm with proper versioning, documentation, and discovery.

### Pre-Publishing Checklist

- [ ] All tests pass (100% coverage on critical paths)
- [ ] Types generated and exported
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] No console.log or debug code
- [ ] Security audit (`npm audit`)

### Publishing Process

```bash
# 1. Update version in package.json (semantic versioning)
# packages/sdk/package.json: "version": "0.1.0"
# packages/cli/package.json: "version": "0.1.0"

# 2. Build and test
bun run build
bun run test

# 3. Create release notes
# docs/CHANGELOG.md

# 4. Publish to npm
npm publish --access public  # packages/sdk
npm publish --access public  # packages/cli

# 5. Create GitHub release
gh release create v0.1.0 -t "v0.1.0" -n "Release notes..."
```

### Package Configuration

```json
// packages/sdk/package.json
{
  "name": "@pantry-pixie/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for Pantry Pixie",
  "homepage": "https://github.com/pantry-pixie/pantry-pixie",
  "repository": {
    "type": "git",
    "url": "https://github.com/pantry-pixie/pantry-pixie.git",
    "directory": "packages/sdk"
  },
  "license": "MIT",
  "author": "Pantry Pixie Team",
  "keywords": [
    "household",
    "grocery",
    "coordination",
    "ai",
    "pantry"
  ],
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.esm.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc && esbuild src/index.ts --bundle --outfile=dist/index.esm.js --format=esm",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

### README Templates

```markdown
# @pantry-pixie/sdk

TypeScript SDK for Pantry Pixie.

## Installation

```bash
npm install @pantry-pixie/sdk
```

## Quick Start

```typescript
import { createPantryPixieSDK } from '@pantry-pixie/sdk';

const sdk = createPantryPixieSDK({
  apiUrl: 'https://api.pantry-pixie.app',
  wsUrl: 'wss://api.pantry-pixie.app',
});

await sdk.login('user@example.com', 'password');
const homes = await sdk.homes.list();
```

## Documentation

[Full documentation](https://docs.pantry-pixie.app/sdk)

## License

MIT
```

### Distribution Channels

- **npm Registry**: `npm install @pantry-pixie/sdk`
- **GitHub Releases**: Binary builds, release notes
- **Homebrew** (CLI only, Phase 2+): `brew install pantry-pixie`
- **Official Website**: Download links, docs

### Metrics & Monitoring

After publishing, track:
- Downloads per week (npm stats)
- GitHub stars (community interest)
- Issues + PRs (engagement)
- Crash reports (stability)

### Deliverables

- [ ] Packages published to npm
- [ ] GitHub releases created
- [ ] npm package statistics visible
- [ ] Official documentation site (docs.pantry-pixie.app)
- [ ] Security audit passing

---

## Phase 2 Acceptance Criteria (Hard Gate)

All must be true to proceed to Phase 3:

### 1. SDK
- [ ] All CRUD operations work via SDK
- [ ] TypeScript types complete and exported
- [ ] 100+ downloads/week on npm
- [ ] WebSocket integration functional
- [ ] Offline queue functional

### 2. CLI
- [ ] All commands work end-to-end
- [ ] Config file management working
- [ ] Interactive prompts functional
- [ ] Help text comprehensive
- [ ] Error messages clear

### 3. Agent Protocol
- [ ] At least 1 external integration (OpenClaw)
- [ ] Tool validation working
- [ ] Rate limiting functional
- [ ] Agent tokens secure

### 4. Publishing
- [ ] SDK published to npm and discoverable
- [ ] CLI published to npm
- [ ] Documentation complete
- [ ] No security vulnerabilities (npm audit)

### 5. Community
- [ ] 10+ GitHub contributors
- [ ] 50+ GitHub stars
- [ ] Active issues/discussions
- [ ] CONTRIBUTING guide followed

---

## Success Metrics for Phase 2

| Metric | Target | Owner |
|--------|--------|-------|
| npm Downloads (SDK) | 100+/week | DevOps |
| npm Downloads (CLI) | 50+/week | DevOps |
| GitHub Stars | 50+ | Community Manager |
| External Integrations | 1+ | Partnerships |
| Documentation Coverage | >95% | Tech Writer |
| Test Coverage | >80% | QA Lead |

---

## Timeline Breakdown

| Week | Focus | Deliverables |
|------|-------|------------|
| 9 | SDK Design | Architecture, type definitions, core services |
| 10 | SDK + CLI | SDK tests, CLI implementation, local testing |
| 11 | Agent Protocol | Tool definitions, API endpoint, OpenClaw integration |
| 12 | Publishing | npm publish, GitHub releases, documentation |

---

## Notes for Developers

1. **SDK simplicity first.** Developers using the SDK should find common tasks trivial.
2. **CLI discoverability.** Help text should answer questions without docs.
3. **Agent protocol is the future.** This enables Pixie to integrate into other tools seamlessly.
4. **Documentation pays off.** Every hour on docs saves 10 hours of support.
5. **Test the SDK extensively.** Bad SDK release = bad developer experience = low adoption.

---

**Phase 2 Status:** Ready to Begin
**Estimated Effort:** 20 person-days
**Team Size:** 1 SDK engineer, 1 CLI engineer, 1 DevOps
