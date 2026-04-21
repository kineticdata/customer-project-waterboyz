// docs/user-guides/capture-helpers.ts
import { Page } from '@playwright/test';

export async function login(page: Page, baseUrl: string, username: string, password: string) {
  await page.goto(`${baseUrl}/#/`);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${baseUrl}/#/`);
  // Wait for layout to stabilize
  await page.waitForLoadState('networkidle');
}

/**
 * Inject a blur style for specified selectors before taking a screenshot.
 * Selectors passed here are blurred in-place.
 */
export async function blurSelectors(page: Page, selectors: string[]) {
  if (selectors.length === 0) return;
  await page.addStyleTag({
    content: `
      ${selectors.join(', ')} {
        filter: blur(6px) !important;
        color: transparent !important;
        text-shadow: 0 0 8px rgba(0,0,0,0.6);
      }
    `,
  });
}

/**
 * Capture a screenshot to docs/user-guides/screenshots/<outPath>.
 * If locator is provided, only that element is screenshotted (cropped).
 */
export async function capture(page: Page, outPath: string, locatorSelector?: string) {
  const fullPath = `screenshots/${outPath}`;
  const target = locatorSelector ? page.locator(locatorSelector) : page;
  await target.screenshot({ path: fullPath });
  console.log(`  ✓ ${fullPath}`);
}

export async function openHamburger(page: Page) {
  await page.locator('button:has(svg.tabler-icon-menu-2)').click();
  await page.locator('[data-scope="popover"][data-part="content"]').waitFor({ state: 'visible' });
}
