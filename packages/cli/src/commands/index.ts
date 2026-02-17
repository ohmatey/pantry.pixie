/**
 * CLI command implementations
 */

import inquirer from "inquirer";
import type { Home, Item, GroceryList, PantryPixieClient } from "@pantry-pixie/sdk";
import { readConfig, writeConfig, getClient, type CliConfig } from "../config";

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(args: string[]): Promise<void>;
}

export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract usage: string;

  abstract execute(args: string[]): Promise<void>;

  protected logSuccess(message: string): void {
    console.log(`✓ ${message}`);
  }

  protected logError(message: string): never {
    console.error(`✗ ${message}`);
    process.exit(1);
  }

  protected logInfo(message: string): void {
    console.log(`ℹ ${message}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveHomeId(
  client: PantryPixieClient,
  config: CliConfig,
  args: string[],
): Promise<string> {
  const homeFlag = args.indexOf("--home");
  if (homeFlag !== -1 && args[homeFlag + 1]) return args[homeFlag + 1];
  if (config.defaultHomeId) return config.defaultHomeId;

  const res = await client.homes.list();
  const homes = (res.data as Home[]) || [];
  if (homes.length === 0) {
    console.error("✗ No homes found. Use the web app to create a home first.");
    process.exit(1);
  }
  if (homes.length === 1) {
    console.log(
      `ℹ Using home "${homes[0].name}". Set default with \`pixie config set homeId ${homes[0].id}\``,
    );
    return homes[0].id;
  }
  const { homeId } = await inquirer.prompt([
    {
      type: "list",
      name: "homeId",
      message: "Select a home:",
      choices: homes.map((h) => ({ name: h.name, value: h.id })),
    },
  ]);
  return homeId;
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && args[i + 1] && !args[i + 1].startsWith("--")) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    } else if (args[i].startsWith("--")) {
      flags[args[i].slice(2)] = "true";
    }
  }
  return flags;
}

function pad(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len - 1) + "…";
  return str.padEnd(len);
}

function positionals(args: string[], flags: Record<string, string>): string[] {
  const flagValues = new Set(Object.values(flags));
  return args.filter((a) => !a.startsWith("--") && !flagValues.has(a));
}

// ─── ConfigCommand ────────────────────────────────────────────────────────────

// Maps CLI key names to CliConfig property names
const CONFIG_KEY_MAP: Record<string, keyof CliConfig> = {
  apiUrl: "apiUrl",
  token: "accessToken",
  homeId: "defaultHomeId",
};

export class ConfigCommand extends BaseCommand {
  name = "config";
  description = "Configure Pantry Pixie";
  usage = "pixie config <set|get|show> [key] [value]";

  async execute(args: string[]): Promise<void> {
    const sub = args[0];
    switch (sub) {
      case "set":
        return this.set(args.slice(1));
      case "get":
        return this.get(args.slice(1));
      case "show":
        return this.show();
      default:
        this.printUsage();
    }
  }

  private set(args: string[]): void {
    const [key, value] = args;
    if (!key || !value) this.logError("Usage: pixie config set <key> <value>");
    const prop = CONFIG_KEY_MAP[key];
    if (!prop) {
      this.logError(
        `Invalid key "${key}". Valid keys: ${Object.keys(CONFIG_KEY_MAP).join(", ")}`,
      );
    }
    writeConfig({ [prop]: value });
    this.logSuccess(`Set ${key}`);
  }

  private get(args: string[]): void {
    const [key] = args;
    if (!key) this.logError("Usage: pixie config get <key>");
    const prop = CONFIG_KEY_MAP[key];
    if (!prop) {
      this.logError(
        `Invalid key "${key}". Valid keys: ${Object.keys(CONFIG_KEY_MAP).join(", ")}`,
      );
    }
    const config = readConfig();
    const val = config[prop];
    console.log(val !== undefined ? val : "(not set)");
  }

  private show(): void {
    const config = readConfig();
    console.log("Pantry Pixie configuration:");
    console.log(`  apiUrl : ${config.apiUrl}`);
    console.log(`  token  : ${config.accessToken ? "***" : "(not set)"}`);
    console.log(`  homeId : ${config.defaultHomeId ?? "(not set)"}`);
  }

  private printUsage(): void {
    console.log(`
pixie config set <key> <value>   Write a config value
pixie config get <key>           Print a config value
pixie config show                Print all config

Keys: apiUrl, token, homeId
`);
  }
}

// ─── ItemCommand ──────────────────────────────────────────────────────────────

export class ItemCommand extends BaseCommand {
  name = "item";
  description = "Manage pantry items";
  usage = "pixie item <add|list|remove> [options]";

  async execute(args: string[]): Promise<void> {
    const sub = args[0];
    switch (sub) {
      case "add":
        return this.add(args.slice(1));
      case "list":
        return this.list(args.slice(1));
      case "remove":
        return this.remove(args.slice(1));
      default:
        this.printUsage();
    }
  }

  private async add(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const pos = positionals(args, flags);
    let name = pos[0];
    let quantity = flags.quantity;
    let unit = flags.unit;
    let category = flags.category;

    if (!name) {
      const ans = await inquirer.prompt([
        { type: "input", name: "name", message: "Item name:" },
        { type: "input", name: "quantity", message: "Quantity (default: 1):", default: "1" },
        { type: "input", name: "unit", message: "Unit (e.g. liters, kg, pieces):" },
        { type: "input", name: "category", message: "Category (optional):" },
      ]);
      name = ans.name;
      quantity = ans.quantity;
      unit = ans.unit;
      category = ans.category;
    }

    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const res = await client.items.create(homeId, {
      name,
      quantity: quantity ? Number(quantity) : 1,
      unit: unit || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: (category || undefined) as any,
    });
    const item = res.data as Item;
    this.logSuccess(`Added ${item.quantity} ${item.unit || "x"} ${item.name}`);
  }

  private async list(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const res = await client.items.list(homeId);
    let items = (((res.data as any)?.items ?? res.data) as Item[]) || [];

    if (flags["low-stock"]) {
      items = items.filter((i) => i.quantity <= 1);
    }

    if (items.length === 0) {
      console.log("No items found.");
      return;
    }

    const header = `${pad("Name", 22)} ${pad("Qty", 5)} ${pad("Unit", 10)} ${pad("Category", 14)} Expires`;
    console.log(header);
    console.log("─".repeat(header.length));
    for (const item of items) {
      const expires = item.expiresAt
        ? new Date(item.expiresAt).toLocaleDateString()
        : "-";
      console.log(
        `${pad(item.name, 22)} ${pad(String(item.quantity), 5)} ${pad(item.unit ?? "-", 10)} ${pad(item.category ?? "-", 14)} ${expires}`,
      );
    }
  }

  private async remove(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const pos = positionals(args, flags);
    const [id] = pos;
    if (!id) this.logError("Usage: pixie item remove <id>");

    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    await client.items.delete(homeId, id);
    this.logSuccess(`Removed item ${id}`);
  }

  private printUsage(): void {
    console.log(`
pixie item add [name] [--quantity <n>] [--unit <unit>] [--category <cat>]
pixie item list [--low-stock] [--home <homeId>]
pixie item remove <id>
`);
  }
}

// ─── ListCommand ──────────────────────────────────────────────────────────────

export class ListCommand extends BaseCommand {
  name = "list";
  description = "Manage grocery lists";
  usage = "pixie list <create|view|add-item> [options]";

  async execute(args: string[]): Promise<void> {
    const sub = args[0];
    switch (sub) {
      case "create":
        return this.create(args.slice(1));
      case "view":
        return this.view(args.slice(1));
      case "add-item":
        return this.addItem(args.slice(1));
      default:
        this.printUsage();
    }
  }

  private async create(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const pos = positionals(args, flags);
    let name = flags.name ?? pos[0];

    if (!name) {
      const ans = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "List name:",
          default: "My List",
        },
      ]);
      name = ans.name;
    }

    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const res = await client.lists.create(homeId, {
      name,
      description: flags.description,
    });
    const list = res.data as GroceryList;
    this.logSuccess(`Created list "${list.name}" (id: ${list.id})`);
  }

  private async view(args: string[]): Promise<void> {
    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const res = await client.lists.list(homeId);
    const lists = (((res.data as any)?.items ?? res.data) as GroceryList[]) || [];

    if (lists.length === 0) {
      console.log("No lists found.");
      return;
    }

    const header = `${pad("Name", 26)} ${pad("Active", 8)} Created`;
    console.log(header);
    console.log("─".repeat(header.length));
    for (const list of lists) {
      const created = list.createdAt
        ? new Date(list.createdAt).toLocaleDateString()
        : "-";
      console.log(
        `${pad(list.name, 26)} ${pad(list.isActive ? "yes" : "no", 8)} ${created}`,
      );
    }
  }

  private async addItem(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const pos = positionals(args, flags);
    const [listId] = pos;
    if (!listId) this.logError("Usage: pixie list add-item <listId> [itemName]");

    let itemName = pos[1];
    let quantity = flags.quantity;

    if (!itemName) {
      const ans = await inquirer.prompt([
        { type: "input", name: "itemName", message: "Item name:" },
        { type: "input", name: "quantity", message: "Quantity (default: 1):", default: "1" },
      ]);
      itemName = ans.itemName;
      quantity = ans.quantity;
    }

    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const res = await client.lists.addItemByName(homeId, listId, {
      name: itemName,
      quantity: quantity ? Number(quantity) : undefined,
    });
    const { item } = res.data as { listItem: unknown; item: Item };
    this.logSuccess(`Added "${item.name}" to list`);
  }

  private printUsage(): void {
    console.log(`
pixie list create [name] [--description <desc>]
pixie list view
pixie list add-item <listId> [itemName] [--quantity <n>]
`);
  }
}

// ─── HomeCommand ──────────────────────────────────────────────────────────────

export class HomeCommand extends BaseCommand {
  name = "home";
  description = "Manage homes";
  usage = "pixie home <list|switch> [options]";

  async execute(args: string[]): Promise<void> {
    const sub = args[0];
    switch (sub) {
      case "list":
        return this.list();
      case "switch":
        return this.switch(args.slice(1));
      default:
        this.printUsage();
    }
  }

  private async list(): Promise<void> {
    const client = getClient();
    const config = readConfig();

    const res = await client.homes.list();
    const homes = (res.data as Home[]) || [];

    if (homes.length === 0) {
      console.log("No homes found.");
      return;
    }

    const header = `${pad("Name", 24)} ${pad("ID", 38)} Default`;
    console.log(header);
    console.log("─".repeat(header.length));
    for (const home of homes) {
      const isDefault = home.id === config.defaultHomeId ? "✓" : "";
      console.log(`${pad(home.name, 24)} ${pad(home.id, 38)} ${isDefault}`);
    }
  }

  private async switch(args: string[]): Promise<void> {
    let homeId = args[0];

    if (!homeId) {
      const client = getClient();
      const res = await client.homes.list();
      const homes = (res.data as Home[]) || [];
      if (homes.length === 0) this.logError("No homes found.");

      const ans = await inquirer.prompt([
        {
          type: "list",
          name: "homeId",
          message: "Select default home:",
          choices: homes.map((h) => ({ name: `${h.name} (${h.id})`, value: h.id })),
        },
      ]);
      homeId = ans.homeId;
    }

    writeConfig({ defaultHomeId: homeId });
    this.logSuccess(`Default home set to ${homeId}`);
  }

  private printUsage(): void {
    console.log(`
pixie home list           List your homes
pixie home switch [id]    Set default home
`);
  }
}

// ─── SyncCommand ──────────────────────────────────────────────────────────────

export class SyncCommand extends BaseCommand {
  name = "sync";
  description = "Sync low-stock items to grocery list";
  usage = "pixie sync [--auto] [--verbose]";

  async execute(args: string[]): Promise<void> {
    const flags = parseFlags(args);
    const auto = flags.auto === "true";
    const verbose = flags.verbose === "true";

    const client = getClient();
    const config = readConfig();
    const homeId = await resolveHomeId(client, config, args);

    const itemsRes = await client.items.list(homeId);
    const allItems = (((itemsRes.data as any)?.items ?? itemsRes.data) as Item[]) || [];
    const lowStock = allItems.filter((i) => i.quantity <= 1);

    if (lowStock.length === 0) {
      this.logSuccess("Everything looks well-stocked!");
      return;
    }

    if (verbose) {
      console.log(`Found ${lowStock.length} low-stock item(s):`);
      for (const item of lowStock) {
        console.log(`  • ${item.name} (${item.quantity} ${item.unit ?? "x"})`);
      }
    }

    const listsRes = await client.lists.list(homeId);
    const lists = (((listsRes.data as any)?.items ?? listsRes.data) as GroceryList[]) || [];
    const activeList = lists.find((l) => l.isActive);

    let listId: string;
    if (!activeList) {
      if (!auto) {
        const { create } = await inquirer.prompt([
          {
            type: "confirm",
            name: "create",
            message: "No active list found. Create one?",
            default: true,
          },
        ]);
        if (!create) return;
      }
      const listRes = await client.lists.create(homeId, { name: "Weekly Shop" });
      listId = (listRes.data as GroceryList).id;
    } else {
      listId = activeList.id;
    }

    if (!auto) {
      const header = `${pad("Item", 22)} ${pad("Qty", 5)} Unit`;
      console.log("\nProposed additions:");
      console.log(header);
      console.log("─".repeat(header.length));
      for (const item of lowStock) {
        console.log(`${pad(item.name, 22)} ${pad(String(item.quantity), 5)} ${item.unit ?? "-"}`);
      }
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Add these ${lowStock.length} item(s) to list?`,
          default: true,
        },
      ]);
      if (!confirm) return;
    }

    let added = 0;
    for (const item of lowStock) {
      try {
        await client.lists.addItemByName(homeId, listId, { name: item.name, quantity: 1 });
        added++;
      } catch {
        if (verbose) console.log(`  ✗ Could not add "${item.name}"`);
      }
    }
    this.logSuccess(`Added ${added} item(s) to list`);
  }
}
