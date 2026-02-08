/**
 * Medium-priority dashboard pages — load + content verification.
 * Each page gets a "loads", "has content", and "buttons work" test.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify, clickAllButtons } from '../helpers/navigation';

const PAGES = [
  { path: '/dashboard/statements',        title: 'Statements' },
  { path: '/dashboard/compliance-docs',   title: 'Compliance' },
  { path: '/dashboard/liquidity',         title: 'Liquidity' },
  { path: '/dashboard/custodians',        title: 'Custodian' },
  { path: '/dashboard/tax-harvest',       title: 'Tax' },
  { path: '/dashboard/prospects',         title: 'Prospect' },
  { path: '/dashboard/conversations',     title: 'Conversation' },
  { path: '/dashboard/model-portfolios',  title: 'Model' },
  { path: '/dashboard/alternative-assets',title: 'Alternative' },
  { path: '/dashboard/chat',             title: 'Chat' },
] as const;

test.describe('Dashboard — Medium Priority Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
  });

  for (const pg of PAGES) {
    test.describe(pg.path, () => {
      test('loads without error', async ({ page }) => {
        await navigateAndVerify(page, pg.path, { title: pg.title });
      });

      test('has meaningful content', async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const text = await page.locator('body').innerText();
        // Page should have substantial content (not just a header)
        expect(text.trim().length).toBeGreaterThan(100);
      });

      test('interactive elements respond', async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);

        const results = await clickAllButtons(page);
        const errors = results.filter((r) => r.status === 'error');
        // No button should throw an exception when clicked
        expect(
          errors.length,
          `Buttons with errors: ${errors.map((e) => `"${e.text}": ${e.notes}`).join('; ')}`,
        ).toBe(0);
      });
    });
  }
});
