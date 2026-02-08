import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify, clickAllButtons } from '../helpers/navigation';

test.describe('Analysis Page — Critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/analysis', { title: 'Analysis' });
  });

  test('displays 6 analysis tool cards', async ({ page }) => {
    const toolCards = page.locator('[class*="rounded-xl"][class*="border"][class*="flex-col"]');
    const count = await toolCards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('"Run Analysis" buttons are visible and clickable', async ({ page }) => {
    const runBtns = page.getByRole('button', { name: /run analysis/i });
    const count = await runBtns.count();
    expect(count).toBeGreaterThan(0);

    // Click the first Run Analysis button
    await runBtns.first().click();
    await page.waitForTimeout(1500);

    // Should show loading spinner OR results
    const hasSpinner = await page.locator('.animate-spin').count();
    const hasResults = await page.locator('[class*="bg-slate-50"][class*="rounded-lg"]').count();
    expect(hasSpinner + hasResults).toBeGreaterThan(0);
  });

  test('"Report" buttons are visible and clickable', async ({ page }) => {
    const reportBtns = page.getByRole('button', { name: /report/i });
    expect(await reportBtns.count()).toBeGreaterThan(0);

    await reportBtns.first().click();
    await page.waitForTimeout(1500);

    // Should open a modal or trigger analysis
    const modal = page.locator('[role="dialog"], [class*="Modal"]');
    const spinner = page.locator('.animate-spin');
    expect((await modal.count()) + (await spinner.count())).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  test('Quick Analysis section is visible', async ({ page }) => {
    await expect(page.getByText(/quick analysis/i)).toBeVisible();
  });
});
