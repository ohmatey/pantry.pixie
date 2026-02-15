/**
 * CLI command implementations
 */

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(args: string[]): Promise<void>;
}

/**
 * Base command class
 */
export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract usage: string;

  abstract execute(args: string[]): Promise<void>;

  protected logSuccess(message: string): void {
    console.log(`✓ ${message}`);
  }

  protected logError(message: string): void {
    console.error(`✗ ${message}`);
    process.exit(1);
  }

  protected logInfo(message: string): void {
    console.log(`ℹ ${message}`);
  }
}

// Command stubs - will be implemented in future versions

export class ItemCommand extends BaseCommand {
  name = "item";
  description = "Manage pantry items";
  usage = "pixie item <subcommand> [options]";

  async execute(args: string[]): Promise<void> {
    this.logInfo("Item command - coming soon");
  }
}

export class ListCommand extends BaseCommand {
  name = "list";
  description = "Manage grocery lists";
  usage = "pixie list <subcommand> [options]";

  async execute(args: string[]): Promise<void> {
    this.logInfo("List command - coming soon");
  }
}

export class HomeCommand extends BaseCommand {
  name = "home";
  description = "Manage homes";
  usage = "pixie home <subcommand> [options]";

  async execute(args: string[]): Promise<void> {
    this.logInfo("Home command - coming soon");
  }
}

export class ConfigCommand extends BaseCommand {
  name = "config";
  description = "Configure Pantry Pixie";
  usage = "pixie config <key> <value>";

  async execute(args: string[]): Promise<void> {
    this.logInfo("Config command - coming soon");
  }
}
