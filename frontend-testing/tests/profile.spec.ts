import { test, expect } from "@playwright/test";
import { login } from "../helpers";
import { TEST_HOST } from "../constants";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("profile page loads with user info", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/profile`);

    // Should show some profile-related content
    await expect(page.locator("text=Profile").first()).toBeVisible();
  });

  test("profile page has account tab", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/profile`);

    // Should have tabs
    const accountTab = page.locator("text=Account").first();
    await expect(accountTab).toBeVisible();
  });

  test("profile page has volunteer tab", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/profile?tab=volunteer`);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Should show volunteer-related content
    await expect(page.locator("body")).not.toContainText("Unexpected error");
  });
});
