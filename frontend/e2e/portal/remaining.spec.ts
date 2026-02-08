/**
 * Client Portal — all protected pages load + content check.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';
import { navigateAndVerify, clickAllButtons } from '../helpers/navigation';
import { PORTAL_PAGES } from '../fixtures/test-data';

test.describe('Client Portal Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  for (const pg of PORTAL_PAGES) {
    test.describe(pg.path, () => {
      test('loads without error', async ({ page }) => {
        await navigateAndVerify(page, pg.path, { title: pg.title });
      });

      test('has meaningful content', async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const text = await page.locator('body').innerText();
        expect(text.trim().length).toBeGreaterThan(100);
      });

      test('buttons respond without errors', async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const results = await clickAllButtons(page);
        const errors = results.filter((r) => r.status === 'error');
        expect(
          errors.length,
          `Broken buttons: ${errors.map((e) => `"${e.text}": ${e.notes}`).join('; ')}`,
        ).toBe(0);
      });
    });
  }
});
