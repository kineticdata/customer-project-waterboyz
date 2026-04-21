// docs/user-guides/capture.ts
/**
 * Playwright screenshot capture for Waterboyz user guides.
 *
 * Usage:  yarn capture [--role swat-leaders|team-captains]
 *
 * Requires docs/user-guides/.env with credentials and SAMPLE_* record IDs.
 */
import { chromium, Browser } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login, blurSelectors, capture, openHamburger } from './capture-helpers';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.PW_BASE_URL || 'https://waterboyz.kinops.io';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(path.join(__dirname, 'screenshots', 'swat-leaders'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'screenshots', 'team-captains'), { recursive: true });

async function captureSwatLeaders(browser: Browser) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await login(page, BASE_URL, required('PW_LEADER_USERNAME'), required('PW_LEADER_PASSWORD'));

  // --- Home / Admin Navigation ---
  await capture(page, 'swat-leaders/home.png');
  await openHamburger(page);
  await capture(page, 'swat-leaders/admin-menu.png', '[data-scope="popover"][data-part="content"]');
  await page.keyboard.press('Escape');

  // --- Volunteer Management ---
  await page.goto(`${BASE_URL}/#/admin/volunteer-management`);
  await page.waitForLoadState('networkidle');
  // Blur volunteer name/email columns since these are aggregate (real PII)
  await blurSelectors(page, [
    '[data-locator="vm-name-cell"]',
    '[data-locator="vm-email-cell"]',
    '[data-locator="vm-phone-cell"]',
  ]);
  await capture(page, 'swat-leaders/vm-table.png');

  // Open detail drawer for sample volunteer
  const sampleVolunteerId = required('SAMPLE_VOLUNTEER_ID');
  await page.goto(`${BASE_URL}/#/admin/volunteer-management?open=${sampleVolunteerId}`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/vm-drawer.png');
  // ... add remaining recipes per section ...

  // --- Reports ---
  await page.goto(`${BASE_URL}/#/admin/reports`);
  await page.waitForLoadState('networkidle');
  await blurSelectors(page, [
    '[data-locator="reports-project-row"] td:nth-child(1)',
    '[data-locator="reports-family-name"]',
  ]);
  await capture(page, 'swat-leaders/reports-dashboard.png');

  // --- Events ---
  await page.goto(`${BASE_URL}/#/events`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/events-list.png');

  const sampleEventId = required('SAMPLE_EVENT_ID');
  await page.goto(`${BASE_URL}/#/events/${sampleEventId}/assign`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/events-assign.png');

  // --- Settings ---
  await page.goto(`${BASE_URL}/#/settings/datastore`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/settings-datastore.png');

  // Mobile pass
  await context.close();
  const mobileCtx = await browser.newContext({ viewport: MOBILE });
  const mpage = await mobileCtx.newPage();
  await login(mpage, BASE_URL, required('PW_LEADER_USERNAME'), required('PW_LEADER_PASSWORD'));
  await mpage.goto(`${BASE_URL}/#/admin/volunteer-management`);
  await mpage.waitForLoadState('networkidle');
  await blurSelectors(mpage, ['[data-locator="vm-name-cell"]', '[data-locator="vm-email-cell"]']);
  await capture(mpage, 'swat-leaders/vm-mobile-cards.png');
  await mobileCtx.close();
}

async function captureTeamCaptains(browser: Browser) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await login(page, BASE_URL, required('PW_CAPTAIN_USERNAME'), required('PW_CAPTAIN_PASSWORD'));

  await capture(page, 'team-captains/home.png');

  const sampleProjectId = required('SAMPLE_PROJECT_ID');
  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/details`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-details.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/volunteers`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-volunteers.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/tasks`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-tasks.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/photos`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-photos.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/notes`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-notes.png');

  await context.close();
}

async function main() {
  const roleArg = process.argv.find(a => a.startsWith('--role='))?.split('=')[1];
  const browser = await chromium.launch();
  try {
    if (!roleArg || roleArg === 'swat-leaders') await captureSwatLeaders(browser);
    if (!roleArg || roleArg === 'team-captains') await captureTeamCaptains(browser);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
