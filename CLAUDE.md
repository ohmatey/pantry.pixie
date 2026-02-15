# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev                # Start web server (port 3000) with watch mode
bun run type-check         # TypeScript type checking (tsc --noEmit)
bun run lint               # ESLint across all packages
bun run format             # Prettier formatting
bun run test               # Run tests with Bun's test runner

# Building
bun run build              # Build all packages
bun run build:core         # Build @pantry-pixie/core only
bun run build:sdk          # Build @pantry-pixie/sdk only
bun run build:cli          # Build @pantry-pixie/cli only
bun run build:web          # Build @pantry-pixie/web only

# Database (requires PostgreSQL)
bun run db:generate        # Generate Drizzle migrations
bun run db:push            # Apply migrations to database
bun run db:studio          # Open Drizzle Studio GUI
```

## Architecture

Bun monorepo with 4 packages that form a layered dependency chain:

```
core → sdk → cli
         → web
```

- **@pantry-pixie/core** (`packages/core/`) — Shared foundation: Drizzle ORM schemas, TypeScript types, Pixie personality system (prompts + intent classification). All other packages depend on this.
- **@pantry-pixie/sdk** (`packages/sdk/`) — TypeScript client library. `PantryPixieClient` with sub-clients (HomeClient, ItemClient, GroceryListClient, ChatClient). Bearer token auth.
- **@pantry-pixie/cli** (`packages/cli/`) — CLI tool (`pixie` command). Uses BaseCommand abstract class pattern. Commands are stubs awaiting implementation.
- **@pantry-pixie/web** (`packages/web/`) — PWA with Bun native HTTP server. REST API routes + WebSocket at `/ws` for real-time chat. Mastra.ai agent integration placeholder. Service worker for offline support.

### Database (Drizzle ORM + PostgreSQL)

8 tables: `users`, `homes`, `home_members`, `items`, `grocery_lists`, `list_items`, `chat_threads`, `chat_messages`. All use UUID primary keys and timestamps. Schemas live in `packages/core/src/schema/`.

### Pixie Personality System

`packages/core/src/pixie/prompts.ts` — System prompt generation with user preference customization (dietary restrictions, cooking skill, budget consciousness, household size).

`packages/core/src/pixie/intents.ts` — MVP keyword/pattern-based intent classification (`classifyIntent()`). 8 intent types: add_item, remove_item, set_recurring, ask_status, budget_question, meal_planning, greeting, clarification_needed.

### API Routes

All routes are defined in `packages/web/src/api/index.ts` following REST conventions under `/api/homes/:homeId/...` for items, lists, and chat. Route handlers are stubs returning `ApiResponse<T>` format.

### Key Types

Defined in `packages/core/src/types/index.ts` and `packages/core/src/constants.ts`:
- Entity types derived from Drizzle schemas (User, Home, Item, GroceryList, ChatThread, etc.)
- `ApiResponse<T>` and `PaginatedResponse<T>` for consistent API responses
- Enums: ItemCategory (12 categories), Unit (15+ units), MemberRole (owner/admin/member/viewer), RecurringInterval, ListStatus
- Validation constraints and error codes in VALIDATION and ERROR_CODES constants

## Workspace Path Aliases

Configured in `tsconfig.base.json`:
- `@pantry-pixie/core` → `packages/core/src`
- `@pantry-pixie/sdk` → `packages/sdk/src`
- `@pantry-pixie/cli` → `packages/cli/src`
- `@pantry-pixie/web` → `packages/web/src`

## CI/CD

Complete GitHub Actions setup with:

**Workflows:**
- `ci.yml` — Lint, type check, test (with PostgreSQL), build, security audit
- `release.yml` — Docker builds, GitHub releases, deployment automation
- `pr-checks.yml` — PR title validation, docs check, bundle size, commit lint

**Automation:**
- Dependabot for weekly dependency updates (npm + GitHub Actions)
- Automated changelog generation from conventional commits
- Multi-platform Docker images (amd64, arm64) pushed to GHCR
- Health endpoint at `/health` for monitoring

**Deployment:**
- Production-ready Dockerfile with multi-stage build
- Docker Compose for local/production deployment
- Release process via git tags: `git tag v1.0.0 && git push origin v1.0.0`

See `.github/CI.md` for complete documentation.

## Project Status

Active MVP development. Core infrastructure (schemas, types, personality system) is complete. CI/CD fully configured with automated testing, Docker builds, and release automation. API route handlers, CLI commands, frontend UI, and Mastra.ai integration are stubbed and awaiting implementation.
