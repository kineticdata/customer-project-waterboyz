import { test, expect } from "@playwright/test";
import { login, openSidebar } from "../helpers";
import { TEST_HOST } from "../constants";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("home page loads after login", async ({ page }) => {
    // Header should be visible with logo
    await expect(page.locator("#app-header nav")).toBeVisible();
    // Footer should be visible
    await expect(page.locator("text=Kinetic Data")).toBeVisible();
  });

  test("sidebar menu opens and shows nav items", async ({ page }) => {
    await openSidebar(page);

    const sidebar = page.locator(
      '[data-scope="popover"][data-part="content"]'
    );
    await expect(sidebar).toBeVisible();

    // Check for expected menu items
    await expect(sidebar.locator("text=Home")).toBeVisible();
    await expect(sidebar.locator("text=My Volunteering")).toBeVisible();
    await expect(sidebar.locator("text=Events")).toBeVisible();
    await expect(sidebar.locator("text=Settings")).toBeVisible();
  });

  test("navigate to My Volunteering", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/my-volunteering`);
    await expect(
      page.locator("text=My Volunteering").first()
    ).toBeVisible();
  });

  test("navigate to Events", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/events`);
    await expect(page.locator("text=Events").first()).toBeVisible();
  });

  test("navigate to Profile", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/profile`);
    await expect(page.locator("text=Profile").first()).toBeVisible();
  });

  test("navigate to Privacy", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/privacy`);
    await expect(page.locator("text=Privacy").first()).toBeVisible();
  });

  test("unknown route redirects to home", async ({ page }) => {
    await page.goto(`${TEST_HOST}/#/nonexistent-route`);
    // Should land on home page, not show an error
    await expect(page.locator("#app-header nav")).toBeVisible();
  });
});
