import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PantryPixieClient } from "@pantry-pixie/sdk";

const CONFIG_DIR = join(
  process.env.HOME || "~",
  ".config",
  "pantry-pixie",
);
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface CliConfig {
  apiUrl: string;
  accessToken?: string;
  defaultHomeId?: string;
}

const DEFAULTS: CliConfig = {
  apiUrl: "http://localhost:3000",
};

export function readConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeConfig(updates: Partial<CliConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const current = readConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...updates }, null, 2));
}

export function getClient(): PantryPixieClient {
  const config = readConfig();
  if (!config.accessToken) {
    throw new Error(
      "Not authenticated. Run `pixie config set token <your-token>` to authenticate.",
    );
  }
  return new PantryPixieClient({
    baseUrl: config.apiUrl,
    accessToken: config.accessToken,
  });
}
