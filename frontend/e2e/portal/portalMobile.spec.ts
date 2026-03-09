import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Portal Mobile (IMM-05)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test('no horizontal scroll on mobile', async ({ page }) => {
    await navigateAndVerify(page, '/portal', { title: 'Portal' });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('hamburger menu visible on mobile', async ({ page }) => {
    await navigateAndVerify(page, '/portal', { title: 'Portal' });
    const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i]').first();
    await expect(menuBtn).toBeVisible({ timeout: 8000 });
  });

  test('portal dashboard renders without crash', async ({ page }) => {
    await navigateAndVerify(page, '/portal', { title: 'Portal' });
    await page.waitForTimeout(2000);
    const elements = await page.locator('body *').count();
    expect(elements).toBeGreaterThan(5);
  });
});
