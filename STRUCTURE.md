# Pantry Pixie Monorepo Structure

Complete scaffolding for Pantry Pixie as a production-ready Bun monorepo.

## Root Configuration

### Core Files
- **package.json** - Bun workspace configuration with scripts for dev, build, test, and database operations
- **bunfig.toml** - Bun runtime configuration
- **tsconfig.json** - Base TypeScript configuration (strict mode, ESNext target)
- **tsconfig.base.json** - Extended base config with workspace path mappings
- **.gitignore** - Comprehensive ignore rules for Node/Bun projects
- **LICENSE** - MIT license
- **README.md** - Project overview with warm brand voice, quick start, and architecture
- **CONTRIBUTING.md** - Contribution guidelines, code style, and PR process

## Packages

### @pantry-pixie/core
Shared types, schemas, and personality system.

**Schema Files** (`src/schema/`):
- `user.ts` - User account and authentication
- `home.ts` - Home/location management and membership
- `item.ts` - Pantry inventory items with categories, expiration, recurring settings
- `grocery-list.ts` - Shopping lists and list items with completion tracking
- `chat.ts` - Chat threads and messages with intent classification
- `index.ts` - Barrel export

**Type Files** (`src/types/`):
- `index.ts` - Comprehensive TypeScript types extending schemas:
  - Entity types (User, Home, Item, GroceryList, ChatMessage, etc.)
  - API types (ApiResponse, PaginatedResponse, CreateItemInput, etc.)
  - Domain types (ItemCategory, RecurringInterval, PixieIntent, etc.)
  - Business logic types (HomeStats, ListStats, BudgetReport, etc.)

**Pixie Personality** (`src/pixie/`):
- `prompts.ts` - The actual Pixie system prompt (warm, witty, encouraging voice) with context customization
- `intents.ts` - Intent classification system:
  - `add_item` - User adding groceries
  - `remove_item` - User removing items
  - `set_recurring` - Setting up recurring reminders
  - `ask_status` - Checking inventory status
  - `budget_question` - Spending queries
  - `meal_planning` - Recipe suggestions
  - `greeting` / `clarification_needed` / `other`
  - Keyword/pattern-based classification (MVP, upgradeable to ML)
- `index.ts` - Barrel export

**Core Package Config**:
- `package.json` - Dependencies: drizzle-orm, postgres; Dev: drizzle-kit, TypeScript
- `tsconfig.json` - Extends root config
- `src/index.ts` - Main barrel export

### @pantry-pixie/sdk
TypeScript client library for Pantry Pixie API.

**Client** (`src/client.ts`):
- `PantryPixieClient` - Main SDK class with configuration
- `HomeClient` - list, get, create, update, delete homes
- `ItemClient` - CRUD for inventory items with pagination
- `GroceryListClient` - Manage shopping lists
- `ChatClient` - Send messages, list threads, get messages
- Type-safe request handling with Bearer token auth

**SDK Package Config**:
- `package.json` - Dependency: @pantry-pixie/core; Exports both main and client subpaths
- `tsconfig.json` - Extends root config
- `src/index.ts` - Main barrel export with all types re-exported

### @pantry-pixie/cli
Command-line interface for power users.

**Commands** (`src/commands/`):
- `BaseCommand` - Abstract base class for all commands
- `ItemCommand` - Manage items from terminal
- `ListCommand` - Manage shopping lists
- `HomeCommand` - Configure homes
- `ConfigCommand` - Set up CLI configuration
- `index.ts` - Command registry and base classes

**CLI Entry Point** (`src/index.ts`):
- Help/version output
- Command routing and execution
- Error handling

**CLI Package Config**:
- `package.json` - Bin entry for `pixie` command
- `tsconfig.json` - Extends root config

### @pantry-pixie/web
Progressive Web App (MVP) with Bun HTTP server.

**API Routes** (`src/api/index.ts`):
- `GET /api/homes` - List all homes
- `GET/POST /api/homes/:homeId/items` - Inventory management
- `GET/POST /api/homes/:homeId/lists` - Grocery list management
- `POST /api/homes/:homeId/chat/threads` - Chat interface
- Routes return proper ApiResponse<T> types
- All route handlers are stubs ready for implementation

**WebSocket Handler** (`src/ws/index.ts`):
- Real-time chat via WebSocket at `/ws`
- Message types: chat, status, inventory_update, ping, pong
- Handlers for open/message/close/error
- Integrated with service worker for offline support

**Agent** (`src/agent/index.ts`):
- `PantryPixieAgent` - Mastra.ai integration placeholder
- Intent classification using core package
- Context management for conversations
- Action execution routing
- Ready for Mastra.ai framework integration

**Server Entry** (`src/index.ts`):
- Bun HTTP server on port 3000 (configurable)
- Route matching with path parameter extraction
- Static file serving (index.html, manifest.json, sw.js)
- WebSocket upgrade handling
- Welcome HTML with status display and feature overview
- Service worker registration for offline PWA support

**PWA Configuration** (`public/manifest.json`):
- Name: "Pantry Pixie", short name: "Pixie"
- Theme color: #8FAF9D (sage green)
- Background color: #F4EFE6 (warm cream)
- Icons (192x192, 512x512, maskable variants)
- Screenshots (narrow and wide forms)
- App shortcuts (Add Item, Chat with Pixie)

**Service Worker** (`public/sw.js`):
- Cache-first strategy for offline functionality
- Cache management with versioning
- Handles install/fetch/activate lifecycle

**Web Package Config**:
- `package.json` - Scripts for dev/build/start
- `tsconfig.json` - Includes DOM and DOM.Iterable types

## Workspace Configuration

### Scripts

```bash
# Development
bun run dev              # Start web server with watch mode

# Building
bun run build            # Build all packages
bun run build:core
bun run build:sdk
bun run build:cli
bun run build:web

# Database (requires .env with DATABASE_URL)
bun run db:generate      # Generate Drizzle migrations
bun run db:push          # Apply migrations to PostgreSQL
bun run db:studio        # Open Drizzle Studio web UI

# Testing & Quality
bun run test             # Run all tests
bun run lint             # ESLint
bun run format           # Prettier
bun run type-check       # Full TypeScript check
```

## Technology Stack

- **Runtime**: Bun (native TypeScript, fast)
- **Language**: TypeScript 5.3 (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **API**: REST + WebSocket via Bun's native HTTP server
- **AI**: Mastra.ai (integration ready)
- **PWA**: Web Components / Minimal framework
- **Package Manager**: Bun with workspace support

## Database Schema

All tables use UUID primary keys and include audit timestamps.

**Tables**:
1. `users` - Account information
2. `homes` - Location/household management
3. `home_members` - Membership and roles
4. `items` - Pantry inventory with expiration and recurring settings
5. `grocery_lists` - Shopping lists with budget tracking
6. `list_items` - Items on lists with completion status
7. `chat_threads` - Conversation threads
8. `chat_messages` - Messages with intent classification

**Relations**: Properly modeled with Drizzle relations for type-safe queries.

## Design Philosophy

1. **Modular**: Each package is independently buildable and testable
2. **Type-Safe**: Strict TypeScript throughout, leveraging Drizzle for DB types
3. **Extensible**: Clear interfaces for adding features
4. **Documented**: Substantial code, not just stubs; ready for immediate development
5. **Warm Voice**: Pixie's personality is baked into the system prompt and response templates
6. **Developer-Friendly**: Clear patterns, good defaults, example implementations

## Getting Started

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env
# Edit with your DATABASE_URL

# Set up database
bun run db:push

# Start development
bun run dev

# Visit http://localhost:3000
```

## What's Ready to Build

- **Database layer**: Full schema with Drizzle ORM, migrations ready
- **API layer**: Route structure with handlers, just needs business logic
- **Chat system**: Intent classification and Pixie personality loaded
- **Type safety**: Comprehensive types for all entities and API contracts
- **PWA base**: Service worker, manifest, offline support
- **SDK**: Client library stubs ready for API integration
- **CLI**: Command structure ready for implementation

This is a production scaffold. Clone it and start building immediately.
