# @pantry-pixie/core

Shared foundation for Pantry Pixie: database schemas, TypeScript types, constants, and the Pixie personality system.

## Installation

```bash
bun add @pantry-pixie/core
```

## Usage

```typescript
import { db, ItemCategory, Unit, MemberRole } from "@pantry-pixie/core";
import { usersTable, itemsTable } from "@pantry-pixie/core/schema";
import { generateSystemPrompt, classifyIntent } from "@pantry-pixie/core/pixie";
import type { ApiResponse, CreateItemInput, Item } from "@pantry-pixie/core/types";
```

> **Note:** Importing `db` requires the `DATABASE_URL` environment variable to be set. It will throw at import time if missing.

## Exports

### Main entry (`@pantry-pixie/core`)

Re-exports everything from the sub-paths below, plus `db` (Drizzle ORM client).

### Sub-path exports

| Import path | Contents |
|---|---|
| `@pantry-pixie/core/schema` | Drizzle table definitions, relations, and inferred entity types |
| `@pantry-pixie/core/types` | Application types, API response wrappers, input types |
| `@pantry-pixie/core/pixie` | System prompt generation, intent classification |

### Schemas (`@pantry-pixie/core/schema`)

8 tables across 5 schema files:

| Table | Key exports |
|---|---|
| `usersTable` | `User`, `NewUser` |
| `homesTable` | `Home`, `NewHome` |
| `homeMembersTable` | `HomeMember`, `NewHomeMember` |
| `itemsTable` | `Item`, `NewItem` |
| `groceryListsTable` | `GroceryList`, `NewGroceryList` |
| `listItemsTable` | `ListItem`, `NewListItem` |
| `chatThreadsTable` | `ChatThread`, `NewChatThread` |
| `chatMessagesTable` | `ChatMessage`, `NewChatMessage` |

### Constants

| Constant | Values |
|---|---|
| `ItemCategory` | `dairy`, `meat`, `produce`, `grains`, `pantry`, `frozen`, `beverages`, `snacks`, `condiments`, `spices`, `baking`, `other` |
| `Unit` | `piece`, `gram`, `kg`, `ml`, `liter`, `oz`, `lb`, `cup`, `tbsp`, `tsp`, `bunch`, `dozen`, `loaf`, `bottle`, `box`, `bag`, `package`, `jar` |
| `MemberRole` | `owner`, `admin`, `member`, `viewer` |
| `ListStatus` | `draft`, `active`, `completed`, `archived` |
| `RecurrenceType` | `once`, `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`, `custom` |
| `ErrorCode` | `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`, `RATE_LIMIT`, `VALIDATION_ERROR` |

### Types (`@pantry-pixie/core/types`)

Key types beyond the schema entities:

- `ApiResponse<T>` / `PaginatedResponse<T>` — standardized API response wrappers
- `AuthToken` — `{ accessToken, refreshToken, expiresIn }`
- `ItemWithStatus` — item with computed `daysUntilExpiration`, `isExpired`, `isExpiringSoon`
- `HomeWithMembers` / `HomeStats` — enriched home types
- `GroceryListWithItems` / `ListStats` — enriched list types
- `ChatContext` / `ConversationMessage` — chat context types
- `CreateItemInput`, `UpdateItemInput`, `CreateGroceryListInput`, `SendChatMessageInput` — input types
- `PixieIntent` — `"add_item" | "remove_item" | "set_recurring" | "ask_status" | "budget_question" | "meal_planning" | "clarification_needed" | "greeting" | "other"`

### Pixie personality (`@pantry-pixie/core/pixie`)

```typescript
import { generateSystemPrompt, classifyIntent } from "@pantry-pixie/core/pixie";

// Generate a context-aware system prompt
const prompt = generateSystemPrompt({
  userName: "Alex",
  dietaryRestrictions: ["vegetarian"],
  cookingSkill: "intermediate",
  budgetConsciousness: "high",
  householdSize: 3,
});

// Classify user message intent
const intent = classifyIntent("I just bought some milk");
// => "add_item"
```

Additional exports: `PIXIE_SYSTEM_PROMPT`, `conversationStarters`, `encouragingMessages`, `responseTemplates`, `intentPatterns`, `getIntentInfo`.

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL (for database operations)

### Setup

```bash
git clone <repo-url> && cd pantry.pixie
bun install
```

### Commands

```bash
bun run build:core     # Compile TypeScript to dist/
bun run dev            # Watch mode (tsc --watch) — run from packages/core/

# Database (requires DATABASE_URL in .env)
bun run db:generate    # Generate Drizzle migrations
bun run db:push        # Apply migrations to database
bun run db:studio      # Open Drizzle Studio GUI
bun run db:seed        # Seed test data
```

### Project structure

```
packages/core/
├── src/
│   ├── index.ts           # Main entry — re-exports everything
│   ├── db.ts              # Drizzle ORM client (requires DATABASE_URL)
│   ├── constants.ts       # Enums and validation constants
│   ├── test-seed.ts       # Test user/home seeding utility
│   ├── schema/
│   │   ├── index.ts       # Schema barrel export
│   │   ├── user.ts        # users table
│   │   ├── home.ts        # homes + home_members tables
│   │   ├── item.ts        # items table
│   │   ├── grocery-list.ts # grocery_lists + list_items tables
│   │   └── chat.ts        # chat_threads + chat_messages tables
│   ├── types/
│   │   └── index.ts       # All application types
│   └── pixie/
│       ├── index.ts       # Pixie barrel export
│       ├── prompts.ts     # System prompts + response templates
│       └── intents.ts     # Intent classification
├── drizzle/               # Generated migrations
├── drizzle.config.ts      # Drizzle Kit config
└── package.json
```
