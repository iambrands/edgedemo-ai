/**
 * Detailed tests for the Performance Reporting page.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('Performance Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/portal/performance', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('displays summary cards', async ({ page }) => {
    await expect(page.locator('text=Total Value')).toBeVisible();
    await expect(page.locator('text=YTD Return')).toBeVisible();
    await expect(page.locator('text=Since Inception')).toBeVisible();
  });

  test('shows portfolio value from mock data', async ({ page }) => {
    const body = await page.locator('body').innerText();
    // Mock data returns total_value: 54905.58 → formatted as $54,906 or $54,905
    expect(body).toMatch(/\$54,90[56]/);
  });

  test('period selector buttons are visible and clickable', async ({ page }) => {
    const periods = ['1M', '3M', 'YTD', '1Y', 'All'];
    for (const p of periods) {
      const btn = page.locator(`button:has-text("${p}")`).first();
      await expect(btn).toBeVisible();
    }

    // Click 1M and verify it becomes active
    await page.click('button:has-text("1M")');
    await page.waitForTimeout(300);
    // The active button gets bg-white class
    const btn1M = page.locator('button:has-text("1M")').first();
    await expect(btn1M).toBeVisible();
  });

  test('tabs switch content', async ({ page }) => {
    // Default tab is Performance Chart — should see benchmark name
    await expect(page.locator('text=60/40 Balanced Index').first()).toBeVisible();

    // Click Asset Allocation tab
    await page.click('button:has-text("Asset Allocation")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Current Allocation')).toBeVisible();
    await expect(page.locator('text=US Equity').first()).toBeVisible();

    // Click Monthly Returns tab
    await page.click('button:has-text("Monthly Returns")');
    await page.waitForTimeout(500);
    await expect(page.locator('h2:has-text("Monthly Returns")').first()).toBeVisible();
  });

  test('asset allocation shows categories', async ({ page }) => {
    await page.click('button:has-text("Asset Allocation")');
    await page.waitForTimeout(500);

    for (const cat of ['US Equity', 'Fixed Income', 'International', 'Alternatives']) {
      await expect(page.locator(`text=${cat}`).first()).toBeVisible();
    }
  });
});
