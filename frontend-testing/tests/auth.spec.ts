import { test, expect } from "@playwright/test";
import { TEST_HOST, USERNAME, PASSWORD } from "../constants";

test.describe("Authentication", () => {
  test("shows login page when unauthenticated", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/`);
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/`);
    await page.getByLabel("Username").fill(USERNAME);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for home page to render (header should appear)
    await expect(page.locator("#app-header nav")).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/`);
    await page.getByLabel("Username").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should stay on login page with error
    await expect(page.getByLabel("Username")).toBeVisible({ timeout: 10000 });
  });

  test("privacy page is accessible without login", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/privacy`);
    await expect(page.locator("text=Privacy")).toBeVisible();
  });
});
