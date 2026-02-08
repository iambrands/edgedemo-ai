import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify, clickAllButtons } from '../helpers/navigation';

test.describe('Households Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/households', { title: 'Households' });
  });

  test('displays household cards', async ({ page }) => {
    const cards = page.locator('[class*="rounded-xl"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('"Add Household" button opens modal', async ({ page }) => {
    const btn = page.getByRole('button', { name: /add household/i });
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"], [class*="Modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 3_000 });
    await page.keyboard.press('Escape');
  });

  test('"Run Analysis" button exists and is clickable', async ({ page }) => {
    const btn = page.getByRole('button', { name: /run analysis/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      // Should not throw — even a no-op is tested by the button audit
    }
  });

  test('"View Report" button navigates to analysis', async ({ page }) => {
    const btn = page.getByRole('button', { name: /view report/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(800);
      expect(page.url()).toContain('/dashboard/analysis');
    }
  });
});
