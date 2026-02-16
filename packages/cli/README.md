# @pantry-pixie/cli

Command-line interface for Pantry Pixie. Manage your pantry, grocery lists, and homes from the terminal.

> **Status:** MVP — all commands are currently stubs awaiting implementation.

## Installation

```bash
bun add -g @pantry-pixie/cli
```

## Usage

```
pixie <command> [options]
```

### Commands

| Command        | Description            |
| -------------- | ---------------------- |
| `pixie item`   | Manage pantry items    |
| `pixie list`   | Manage grocery lists   |
| `pixie home`   | Manage homes           |
| `pixie config` | Configure Pantry Pixie |

### Options

| Flag              | Description       |
| ----------------- | ----------------- |
| `--help`, `-h`    | Show help message |
| `--version`, `-v` | Show version      |

### Examples

```bash
pixie item add "milk" --quantity 2 --unit liters
pixie list create "Weekly shopping"
pixie config set apiUrl https://api.pantry.pixie
```

### Planned commands

These commands exist as files but are not yet wired into the CLI:

```
pixie add [name]           # Add item to pantry
  -c, --category <cat>
  -q, --quantity <qty>
  -u, --unit <unit>
  -e, --expires <date>     # YYYY-MM-DD
  -l, --location <loc>
  -n, --notes <notes>
  --batch                  # Batch-add mode

pixie list create          # Create grocery list
pixie list view            # View lists
pixie list add-item <id>   # Add item to list
pixie list sync <id>       # Sync list with pantry

pixie sync                 # Sync inventory
  -a, --auto               # Auto-sync with recommendations
  -v, --verbose
```

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
bun run build:cli    # Compile TypeScript to dist/
bun run dev          # Watch mode (tsc --watch) — run from packages/cli/
```

### Running locally

```bash
bun packages/cli/src/index.ts --help
```

### Project structure

```
packages/cli/
├── src/
│   ├── index.ts          # Entry point (shebang: #!/usr/bin/env bun)
│   │                     #   Command map, arg parsing, help output
│   └── commands/
│       ├── index.ts      # BaseCommand abstract class + 4 stub commands
│       │                 #   (ItemCommand, ListCommand, HomeCommand, ConfigCommand)
│       ├── add.ts        # Commander.js add command (not yet integrated)
│       ├── list.ts       # Commander.js list subcommands (not yet integrated)
│       └── sync.ts       # Commander.js sync command (not yet integrated)
└── package.json          # bin: { "pixie": "./dist/index.js" }
```

### Architecture

Commands extend `BaseCommand`:

```typescript
abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract usage: string;
  abstract execute(args: string[]): Promise<void>;

  protected logSuccess(message: string): void; // "✓ ..."
  protected logError(message: string): void; // "✗ ..." + exit(1)
  protected logInfo(message: string): void; // "ℹ ..."
}
```

Dependencies: `@pantry-pixie/core`, `@pantry-pixie/sdk`.
