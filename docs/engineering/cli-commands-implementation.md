# CLI Commands Implementation

**Date:** 2026-02-17
**Status:** Ready to implement
**Scope:** `packages/cli/src/`

## TLDR

- The CLI has two parallel command systems — consolidate onto the `BaseCommand` pattern in `commands/index.ts` (drop Commander.js stubs)
- Need a config store (`~/.config/pantry-pixie/config.json`) for `apiUrl`, `token`, `defaultHomeId`
- Wire all commands through `PantryPixieClient` from `@pantry-pixie/sdk`
- Implement: `item add`, `item list`, `list create`, `list view`, `list add-item`, `sync`
- Config command (`pixie config set/get`) is the prerequisite — must land first

---

## Current State

### Architecture gap

`packages/cli/src/index.ts` uses a `BaseCommand` abstract class (no dependencies, stub `execute()` bodies). Meanwhile `commands/add.ts`, `commands/list.ts`, and `commands/sync.ts` are Commander.js files with `inquirer` prompts — but they are **not imported anywhere** and are effectively dead code.

**Decision:** Implement commands inside the existing `BaseCommand` classes in `commands/index.ts`. Delete (or repurpose) the orphaned Commander files once the new implementations are complete.

### What's missing

1. **Config store** — no persistence for `apiUrl` or `accessToken`
2. **SDK wiring** — no command instantiates `PantryPixieClient`
3. **Subcommand routing** — `ItemCommand.execute()` ignores `args[0]` (subcommand)
4. **All business logic** — every command body is a stub

---

## Config Store

Create `packages/cli/src/config.ts`:

```ts
// Persists to: ~/.config/pantry-pixie/config.json
interface CliConfig {
  apiUrl: string;        // default: "http://localhost:3000"
  accessToken?: string;
  defaultHomeId?: string;
}

export function readConfig(): CliConfig
export function writeConfig(updates: Partial<CliConfig>): void
export function getClient(): PantryPixieClient  // throws if no token
```

Use `Bun.env.HOME` to resolve the config path. Fall back to `http://localhost:3000` if `apiUrl` is unset. Throw a friendly error ("Run `pixie config set token <token>` to authenticate") if `accessToken` is missing when a command needs it.

---

## Implementation Plan

### Phase 0: Config command (prerequisite)

**Command:** `ConfigCommand` in `commands/index.ts`

```
pixie config set <key> <value>   # write a key to config
pixie config get <key>           # print a config value
pixie config show                # print all config (redact token)
```

Keys: `apiUrl`, `token`, `homeId`

Implementation:
1. Parse `args[0]` as subcommand (`set` | `get` | `show`)
2. For `set`: call `writeConfig({ [key]: value })`
3. For `get`: call `readConfig()`, print `config[key]`
4. For `show`: print all keys, replace token with `***` if set

This needs to land first — all other commands depend on config.

---

### Phase 1: Item commands

**Command:** `ItemCommand` in `commands/index.ts`

```
pixie item add [name] [--quantity <n>] [--unit <unit>] [--category <cat>]
pixie item list [--category <cat>] [--low-stock]
pixie item remove <id>
```

**`item add` implementation:**
1. Load config, get `defaultHomeId` (error if unset)
2. If `name` not in args, prompt interactively (name, category, quantity, unit)
3. Call `client.items.create(homeId, { name, category, quantity, unit })`
4. Print: `✓ Added 2 liters of milk`

**`item list` implementation:**
1. Call `client.items.list(homeId)`
2. Format as a simple table: `ID | Name | Qty | Unit | Category | Expires`
3. Support `--low-stock` flag: filter items where `quantity <= lowStockThreshold`

**Subcommand routing pattern** (applies to all commands):
```ts
async execute(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case "add": return this.add(args.slice(1));
    case "list": return this.list(args.slice(1));
    case "remove": return this.remove(args.slice(1));
    default: this.printUsage(); // show help
  }
}
```

---

### Phase 2: List commands

**Command:** `ListCommand` in `commands/index.ts`

```
pixie list create [--name <name>] [--description <desc>]
pixie list view [--status <status>]
pixie list add-item <listId> [itemName]
```

**`list create` implementation:**
1. Prompt for name if not provided (default: "My List")
2. Call `client.lists.create(homeId, { name, description })`
3. Print: `✓ Created list "Weekly Shop" (id: abc123)`

**`list view` implementation:**
1. Call `client.lists.list(homeId)`
2. For each list, show: name, status, item count, created date
3. Format: simple columnar table

**`list add-item` implementation:**
1. Parse `listId` from args
2. Prompt for `itemName` if not provided
3. Prompt for `quantity`, `unit`, `priority` (low/medium/high)
4. Call `client.lists.addItem(homeId, listId, { itemName, quantity, unit, priority })`

Note: `client.lists` currently has no `addItem` method. Need to add to SDK:
```ts
// Add to GroceryListClient in packages/sdk/src/client.ts
async addItem(homeId: string, listId: string, data: AddListItemByNameInput): Promise<ApiResponse<ListItem>>
async getItems(homeId: string, listId: string): Promise<ApiResponse<ListItem[]>>
```

---

### Phase 3: Sync command

**Command:** `SyncCommand` (new class in `commands/index.ts`, register in `index.ts`)

```
pixie sync [--auto] [--verbose]
```

**Implementation:**
1. Load all items from pantry (`client.items.list(homeId)`)
2. Filter for low-stock items (quantity < 2 or explicit low-stock flag)
3. Get active grocery lists (`client.lists.list(homeId)`)
4. If no active list, prompt to create one
5. Show proposed additions as a table
6. If `--auto`, skip confirmation; otherwise prompt `Add these items? (Y/n)`
7. Add confirmed items to the list via `client.lists.addItem()`
8. Print summary: `✓ Added 4 items to "Weekly Shop"`

---

## File Changes

| File | Action |
|------|--------|
| `packages/cli/src/config.ts` | Create — config read/write, `getClient()` factory |
| `packages/cli/src/commands/index.ts` | Edit — implement all command bodies |
| `packages/cli/src/index.ts` | Edit — register `SyncCommand`, wire `config` arg handling |
| `packages/sdk/src/client.ts` | Edit — add `addItem()` and `getItems()` to `GroceryListClient` |
| `packages/cli/src/commands/add.ts` | Delete after implementation (orphaned) |
| `packages/cli/src/commands/list.ts` | Delete after implementation (orphaned) |
| `packages/cli/src/commands/sync.ts` | Delete after implementation (orphaned) |

---

## ACTION PLAN

1. **Create `packages/cli/src/config.ts`** — config read/write + `getClient()` factory
2. **Implement `ConfigCommand`** in `commands/index.ts` — `set`, `get`, `show` subcommands
3. **Extend SDK** — add `addItem()` + `getItems()` to `GroceryListClient`
4. **Implement `ItemCommand`** — `add` (interactive + direct), `list` (table output), subcommand routing
5. **Implement `ListCommand`** — `create`, `view`, `add-item` subcommands
6. **Add `SyncCommand` class**, register in `index.ts`, implement low-stock sync flow
7. **Delete orphaned Commander files** — `commands/add.ts`, `commands/list.ts`, `commands/sync.ts`
8. **Run `bun run type-check`** — verify no regressions

---

## Notes

- **No external table library** — use manual padding (`String.padEnd()`) for table formatting to keep deps minimal
- **Interactive prompts** — use `@inquirer/prompts` (already in package.json) not the legacy `inquirer`
- **Error messages** — always prefix with `✗` and exit 1; success with `✓`; info with `ℹ`
- **homeId resolution** — commands that need a homeId should: (1) use `--home` flag if provided, (2) fall back to `config.defaultHomeId`, (3) call `client.homes.list()` and prompt if neither is set
