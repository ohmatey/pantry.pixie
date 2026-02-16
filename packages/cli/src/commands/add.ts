/**
 * 'add' command - Add items to pantry
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
export const addCommand = new Command("add")
  .description("Add items to your pantry")
  .argument("[name]", "Item name")
  .option("-c, --category <category>", "Item category")
  .option("-q, --quantity <quantity>", "Quantity")
  .option("-u, --unit <unit>", "Unit of measurement")
  .option("-e, --expires <date>", "Expiry date (YYYY-MM-DD)")
  .option("-l, --location <location>", "Storage location")
  .option("-n, --notes <notes>", "Additional notes")
  .option("--batch", "Batch add mode - add multiple items")
  .action(
    async (
      name: string | undefined,
      options: Record<string, string>,
      command: Command,
    ) => {
      try {
        // TODO: Implement add item command:
        // 1. Get parent command's global options (apiUrl, token, home)
        // 2. Create SDK client with credentials
        // 3. If name provided, use it; otherwise prompt for input
        // 4. If not all fields provided, prompt interactively
        // 5. Call client.addItem()
        // 6. Display success message with item details
        // 7. Optionally save to recent items for faster future additions

        const parentOptions = command.parent?.opts?.() || {};

        if (!name) {
          // Interactive mode
          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Item name:",
              validate: (val: string) => val.length > 0,
            },
            {
              type: "list",
              name: "category",
              message: "Category:",
              choices: [
                "dairy",
                "meat",
                "produce",
                "grains",
                "pantry",
                "frozen",
                "beverages",
                "snacks",
                "condiments",
                "spices",
                "baking",
                "other",
              ],
            },
            {
              type: "number",
              name: "quantity",
              message: "Quantity:",
              default: 1,
            },
            {
              type: "input",
              name: "unit",
              message: "Unit:",
              default: "piece",
            },
          ]);

          console.log(
            chalk.green(
              `✓ Added ${answers.quantity} ${answers.unit} of ${answers.name}`,
            ),
          );
        } else {
          // Direct mode with provided name
          console.log(
            chalk.green(`✓ Added ${options.quantity || 1} of ${name}`),
          );
        }
      } catch (error) {
        console.error(chalk.red(`✗ Error adding item: ${error}`));
        process.exit(1);
      }
    },
  );
