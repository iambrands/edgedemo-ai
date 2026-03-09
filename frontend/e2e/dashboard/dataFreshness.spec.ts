import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Data Freshness Indicator (IMM-01)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.route('**/api/v1/market-data/advisor/*/data-freshness', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ last_sync: new Date().toISOString(), stale: false, age_seconds: 15 }),
      })
    );
  });

  test('indicator shows on dashboard', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard', { title: 'Dashboard' });
    await expect(page.getByText(/live/i).first()).toBeVisible({ timeout: 8000 });
  });
});
