#!/usr/bin/env bun

/**
 * @pantry-pixie/cli
 * Command-line interface for Pantry Pixie
 */

import {
  ItemCommand,
  ListCommand,
  HomeCommand,
  ConfigCommand,
  type Command,
} from "./commands";

const commands: Map<string, Command> = new Map([
  ["item", new ItemCommand()],
  ["list", new ListCommand()],
  ["home", new HomeCommand()],
  ["config", new ConfigCommand()],
]);

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const commandName = args[0];

  if (commandName === "--version" || commandName === "-v") {
    console.log("Pantry Pixie CLI v0.0.1");
    process.exit(0);
  }

  if (commandName === "--help" || commandName === "-h") {
    printHelp();
    process.exit(0);
  }

  const command = commands.get(commandName);

  if (!command) {
    console.error(`✗ Unknown command: ${commandName}`);
    console.log("\nRun 'pixie --help' for usage information.");
    process.exit(1);
  }

  try {
    await command.execute(args.slice(1));
  } catch (error) {
    console.error(
      "✗ Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
Pantry Pixie CLI v0.0.1
Your warm, witty kitchen companion—now in your terminal.

USAGE
  pixie <command> [options]

COMMANDS
  item          Manage pantry items
  list          Manage grocery lists
  home          Manage homes
  config        Configure Pantry Pixie

OPTIONS
  --help, -h    Show this help message
  --version, -v Show version information

EXAMPLES
  pixie item add "milk" --quantity 2 --unit liters
  pixie list create "Weekly shopping"
  pixie config set apiUrl https://api.pantryx.pixie

For more information, visit: https://github.com/yourusername/pantry-pixie
`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
