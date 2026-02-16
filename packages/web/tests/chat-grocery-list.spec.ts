import { test, expect } from "@playwright/test";

test.describe("Grocery List in Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display grocery list component after adding items via chat", async ({
    page,
  }) => {
    // Skip for now - requires full auth setup
    test.skip(true, "Requires authentication and OpenAI API key");

    // Navigate to chat
    await page.goto("/chat");
    await page.waitForSelector('[data-testid="chat-input"]');

    // Send message to add items
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("add milk and eggs to my list");
    await input.press("Enter");

    // Wait for assistant response
    await page.waitForSelector('[role="status"]', {
      state: "hidden",
      timeout: 10000,
    });

    // Verify grocery list component appears in chat
    await expect(
      page.locator('[data-testid="grocery-list-in-chat"]'),
    ).toBeVisible({
      timeout: 5000,
    });

    // Verify list contains the items
    const listItems = page.locator('[data-testid="list-item-row"]');
    await expect(listItems).toHaveCount(2);

    // Verify item names
    const itemNames = await listItems.allTextContents();
    expect(
      itemNames.some((name) => name.toLowerCase().includes("milk")),
    ).toBeTruthy();
    expect(
      itemNames.some((name) => name.toLowerCase().includes("eggs")),
    ).toBeTruthy();
  });

  test("should allow toggling items in chat grocery list", async ({ page }) => {
    test.skip(true, "Requires authentication and OpenAI API key");

    await page.goto("/chat");

    // Assume a grocery list is already visible from previous messages
    const firstItem = page.locator('[data-testid="list-item-row"]').first();
    const checkbox = firstItem.locator('[data-testid="item-checkbox"]');

    // Check initial state
    const wasChecked = await checkbox.isChecked();

    // Toggle the item
    await checkbox.click();

    // Verify optimistic update
    await expect(checkbox).toHaveAttribute(
      "aria-checked",
      (!wasChecked).toString(),
    );

    // Wait for backend confirmation (progress bar should update)
    await page.waitForTimeout(500);

    // Verify state persisted
    await expect(checkbox).toHaveAttribute(
      "aria-checked",
      (!wasChecked).toString(),
    );
  });

  test("should show streaming text before final list UI", async ({ page }) => {
    test.skip(true, "Requires authentication and OpenAI API key");

    await page.goto("/chat");
    const input = page.locator('[data-testid="chat-input"]');

    // Send message
    await input.fill("add apples to my shopping list");
    await input.press("Enter");

    // Should see typing indicator immediately
    await expect(page.locator('text="Pixie is thinking..."')).toBeVisible({
      timeout: 1000,
    });

    // Should see text message before UI component
    await expect(page.locator('[role="assistant"]').last()).toBeVisible({
      timeout: 10000,
    });

    // UI component should appear after text
    await expect(
      page.locator('[data-testid="grocery-list-in-chat"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should sync list updates across multiple tabs", async ({ browser }) => {
    test.skip(true, "Requires authentication and OpenAI API key");

    // Create two pages (tabs)
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Both navigate to chat with same list
    await page1.goto("/chat");
    await page2.goto("/chat");

    // Assume both pages show the same grocery list
    const checkbox1 = page1.locator('[data-testid="item-checkbox"]').first();
    const checkbox2 = page2.locator('[data-testid="item-checkbox"]').first();

    // Toggle in page 1
    await checkbox1.click();

    // Verify page 2 receives the update via WebSocket
    await page2.waitForTimeout(500); // Wait for WebSocket event
    const isChecked1 = await checkbox1.isChecked();
    const isChecked2 = await checkbox2.isChecked();
    expect(isChecked1).toBe(isChecked2);

    await context.close();
  });

  test("should show correct completion percentage", async ({ page }) => {
    test.skip(true, "Requires authentication and OpenAI API key");

    await page.goto("/chat");

    // Assume a list with 3 items is visible
    const progressBar = page.locator('[data-testid="grocery-list-progress"]');
    await expect(progressBar).toBeVisible();

    // Check initial percentage (assume 0%)
    const initialWidth = await progressBar.evaluate((el) => el.style.width);
    expect(initialWidth).toBe("0%");

    // Toggle first item
    await page.locator('[data-testid="item-checkbox"]').first().click();

    // Wait for update
    await page.waitForTimeout(300);

    // Progress should update (1/3 = 33%)
    const updatedWidth = await progressBar.evaluate((el) => el.style.width);
    expect(updatedWidth).toContain("33");
  });
});
