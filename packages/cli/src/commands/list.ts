/**
 * 'list' command - Manage grocery lists
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

export const listCommand = new Command("list")
  .description("Manage grocery lists")
  .addCommand(
    new Command("create")
      .description("Create a new grocery list")
      .option("-n, --name <name>", "List name")
      .option("-d, --description <description>", "List description")
      .action(async (options: Record<string, string>) => {
        try {
          // TODO: Implement create list:
          // 1. Prompt for list details if not provided
          // 2. Create list via SDK
          // 3. Show success with list ID
          // 4. Optionally add items immediately

          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "List name:",
              default: options.name || "My List",
            },
          ]);

          console.log(chalk.green(`✓ Created list: ${answers.name}`));
        } catch (error) {
          console.error(chalk.red(`✗ Error creating list: ${error}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("view")
      .description("View grocery lists")
      .option("-s, --status <status>", "Filter by status")
      .action(async (_options: Record<string, string>) => {
        try {
          // TODO: Implement list viewing:
          // 1. Get lists from SDK (with optional status filter)
          // 2. Format and display as table
          // 3. Show completion percentage
          // 4. Show budget info if available

          console.log(chalk.blue("📋 Your grocery lists:"));
          console.log(
            chalk.gray("(Run 'pixie list create' to create a new list)")
          );
        } catch (error) {
          console.error(chalk.red(`✗ Error retrieving lists: ${error}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("add-item")
      .description("Add item to list")
      .argument("<listId>", "List ID")
      .argument("[itemName]", "Item name")
      .action(async (listId: string, itemName: string | undefined) => {
        try {
          // TODO: Implement add to list:
          // 1. Get list details
          // 2. If itemName not provided, prompt for it
          // 3. Prompt for quantity, unit, priority
          // 4. Add to list via SDK
          // 5. Show updated list

          console.log(chalk.green(`✓ Added item to list ${listId}`));
        } catch (error) {
          console.error(chalk.red(`✗ Error adding item: ${error}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("sync")
      .description("Sync list with pantry items")
      .argument("<listId>", "List ID")
      .action(async (listId: string) => {
        try {
          // TODO: Implement list sync:
          // 1. Get pantry items
          // 2. Suggest items to add based on low stock
          // 3. Allow user to select items
          // 4. Add selected items to list

          console.log(chalk.green(`✓ Synced list ${listId} with pantry`));
        } catch (error) {
          console.error(chalk.red(`✗ Error syncing list: ${error}`));
          process.exit(1);
        }
      })
  );
