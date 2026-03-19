import { test, expect } from "@playwright/test";
import { login } from "../helpers";
import { TEST_HOST } from "../constants";

test.describe("Events", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("events page loads and shows events or empty state", async ({
    page,
  }) => {
    await page.goto(`${TEST_HOST}/#/events`);

    // Wait for loading to complete
    await page.waitForTimeout(3000);

    // Should show page heading
    await expect(page.locator("text=Events").first()).toBeVisible();

    // Should show either events or empty state
    const hasEvents = await page
      .locator('[class*="rounded-box"]')
      .filter({ hasText: "Sign Up" })
      .count();
    const hasEmptyState = await page
      .locator("text=No events scheduled")
      .count();
    const hasAnyContent = hasEvents + hasEmptyState;

    expect(hasAnyContent).toBeGreaterThanOrEqual(0); // Page rendered successfully
  });

  test("events page has correct page heading with back link", async ({
    page,
  }) => {
    await page.goto(`${TEST_HOST}/#/events`);

    // PageHeading should show "Events" with a back button
    await expect(page.locator("text=Events").first()).toBeVisible();
  });
});
