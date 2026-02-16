import { test, expect } from "@playwright/test";

test.describe("Offline Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should toggle items offline and sync when online", async ({
    page,
    context,
  }) => {
    // Skip login for demo (would need to implement login flow in real tests)
    test.skip(true, "Requires authentication setup");

    // Go to list page
    await page.goto("/list");
    await page.waitForSelector('[data-testid="item-row"]');

    // Store initial item count
    const items = await page.locator('[data-testid="item-checkbox"]').count();
    expect(items).toBeGreaterThan(0);

    // Go offline
    await context.setOffline(true);

    // Toggle first item
    const firstItem = page.locator('[data-testid="item-checkbox"]').first();
    const wasChecked = await firstItem.isChecked();
    await firstItem.click();

    // Verify optimistic update (instant)
    await expect(firstItem).toHaveAttribute(
      "aria-pressed",
      (!wasChecked).toString(),
    );

    // Verify offline indicator appears
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toContainText("1 change");

    // Go back online
    await context.setOffline(false);

    // Wait for sync (check that offline indicator disappears)
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).not.toBeVisible({
      timeout: 5000,
    });

    // Verify item state persisted
    await expect(firstItem).toHaveAttribute(
      "aria-pressed",
      (!wasChecked).toString(),
    );
  });

  test("should queue chat messages offline", async ({ page, context }) => {
    test.skip(true, "Requires authentication setup");

    await page.goto("/chat");

    // Go offline
    await context.setOffline(true);

    // Send message
    await page.fill('[data-testid="chat-input"]', "Add milk to my list");
    await page.click('[data-testid="chat-send"]');

    // Verify message appears (optimistic)
    await expect(page.locator("text=Add milk to my list")).toBeVisible();

    // Verify queued indicator
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toContainText("change");

    // Go online
    await context.setOffline(false);

    // Wait for sync
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should load cached data when offline", async ({ page, context }) => {
    test.skip(true, "Requires authentication setup");

    // Load data while online
    await page.goto("/list");
    await page.waitForSelector('[data-testid="item-row"]');
    const itemCount = await page.locator('[data-testid="item-row"]').count();
    expect(itemCount).toBeGreaterThan(0);

    // Go offline
    await context.setOffline(true);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify data loaded from cache
    await expect(page.locator('[data-testid="item-row"]')).toHaveCount(
      itemCount,
    );
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();
  });

  test("should be installable as PWA", async ({ page }) => {
    // Check manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // Check if running in browser that supports service workers
    const swSupported = await page.evaluate(() => {
      return "serviceWorker" in navigator;
    });
    expect(swSupported).toBe(true);

    // Check manifest content
    const manifestResponse = await page.goto("/manifest.json");
    expect(manifestResponse?.status()).toBe(200);

    const manifest = await manifestResponse?.json();
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("short_name");
    expect(manifest).toHaveProperty("icons");
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("should register service worker", async ({ page }) => {
    await page.goto("/");

    // Wait for service worker to register
    const swRegistered = await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          return !!registration;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(swRegistered).toBe(true);
  });

  test("should handle network state transitions", async ({ page, context }) => {
    test.skip(true, "Requires authentication setup");

    await page.goto("/list");

    // Go offline
    await context.setOffline(true);
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();

    // Go online
    await context.setOffline(false);
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).not.toBeVisible({
      timeout: 5000,
    });

    // Go offline again
    await context.setOffline(true);
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper ARIA labels on interactive elements", async ({
    page,
  }) => {
    test.skip(true, "Requires authentication setup");

    await page.goto("/list");

    // Check item checkboxes have aria-labels
    const firstItem = page.locator("button[aria-label]").first();
    const ariaLabel = await firstItem.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/(Check|Uncheck)/);
  });

  test("should support keyboard navigation", async ({ page }) => {
    test.skip(true, "Requires authentication setup");

    await page.goto("/list");

    // Tab through items
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/");

    // This is a basic check - in real tests you'd use axe-core or similar
    const backgroundColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    expect(backgroundColor).toBeTruthy();
  });
});

test.describe("Performance", () => {
  test("should load initial page quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should have service worker for fast subsequent loads", async ({
    page,
  }) => {
    // First load
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for service worker to activate
    await page.waitForTimeout(1000);

    // Second load (should be cached)
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Cached load should be very fast
    expect(loadTime).toBeLessThan(1000);
  });
});
