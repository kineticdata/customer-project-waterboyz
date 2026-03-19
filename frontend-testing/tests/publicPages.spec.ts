import { test, expect } from "@playwright/test";
import { TEST_HOST } from "../constants";

test.describe("Public Pages (no auth required)", () => {
  test("public events list page loads", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/public/events`);

    // Should show the events heading
    await expect(page.locator("text=Upcoming Events").first()).toBeVisible();
  });

  test("public events list shows events or empty state", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/public/events`);

    // Wait for loading to finish — either events or empty state should appear
    await page.waitForTimeout(3000);

    const hasEvents = await page.locator("a[href*='/public/events/']").count();
    const hasEmptyState = await page
      .locator("text=No events currently open")
      .count();

    // One of these should be visible
    expect(hasEvents + hasEmptyState).toBeGreaterThan(0);
  });

  test("login page loads with form", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/login`);

    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("reset password page loads", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/reset-password`);

    // Should show some form of password reset UI
    await expect(page.locator("body")).not.toContainText("Unexpected error");
  });

  test("create account page loads", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/create-account`);

    // Should render without errors
    await expect(page.locator("body")).not.toContainText("Unexpected error");
  });

  test("authenticated user is redirected from public events to /events", async ({
    page,
  }) => {
    // This test verifies the redirect logic.
    // First login, then try to access public events
    const { USERNAME, PASSWORD } = await import("../constants");
    if (!USERNAME || !PASSWORD) {
      test.skip();
      return;
    }

    await page.goto(`${TEST_HOST}/#/`);
    await page.getByLabel("Username").fill(USERNAME);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(`${TEST_HOST}/#/`);

    // Now navigate to public events
    await page.goto(`${TEST_HOST}/#/public/events`);

    // Should redirect to authenticated events page
    await page.waitForURL(`${TEST_HOST}/#/events`);
  });
});
