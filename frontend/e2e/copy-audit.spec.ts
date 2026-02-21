/**
 * Copy Audit — ensures AVOID phrases don't appear in user-facing pages.
 *
 * Checks key public and dashboard pages for phrases that should have been
 * removed or replaced during the branding/copy update process.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from './helpers/auth';

const AVOID_PATTERNS = [
  /\bEdgeAI\b/,
  /\bAI[- ]native\b/i,
  /\btax savings\b/i,
  /\bfull compliance solution\b/i,
  /\beliminate risk\b/i,
];

const PUBLIC_PAGES_TO_CHECK = [
  '/',
  '/about/technology',
  '/about/methodology',
  '/company/about',
  '/company/blog',
  '/company/contact',
  '/investors',
  '/professionals',
];

test.describe('Copy Audit — AVOID phrases removed from public pages', () => {
  for (const path of PUBLIC_PAGES_TO_CHECK) {
    test(`${path} has no AVOID phrases`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const bodyText = await page.locator('body').innerText();

      for (const pattern of AVOID_PATTERNS) {
        expect(bodyText, `"${pattern}" found on ${path}`).not.toMatch(pattern);
      }
    });
  }
});

const DASHBOARD_PAGES_TO_CHECK = [
  '/dashboard',
  '/dashboard/screener',
  '/dashboard/bulk-import',
  '/dashboard/messages',
  '/dashboard/best-execution',
  '/dashboard/compliance',
  '/dashboard/tax-harvest',
  '/dashboard/trading',
  '/dashboard/billing',
];

test.describe('Copy Audit — AVOID phrases removed from dashboard pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
  });

  for (const path of DASHBOARD_PAGES_TO_CHECK) {
    test(`${path} has no AVOID phrases`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const bodyText = await page.locator('body').innerText();

      for (const pattern of AVOID_PATTERNS) {
        expect(bodyText, `"${pattern}" found on ${path}`).not.toMatch(pattern);
      }
    });
  }
});
