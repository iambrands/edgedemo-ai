import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/settings', { title: 'Settings' });
  });

  test('profile section displays user info', async ({ page }) => {
    await expect(page.getByText(/profile information/i)).toBeVisible();
  });

  test('API key section is visible', async ({ page }) => {
    await expect(page.getByText(/api key/i).first()).toBeVisible();
  });

  test('show/hide API key toggle works', async ({ page }) => {
    const toggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await toggle.click();
    await page.waitForTimeout(200);
  });

  test('copy API key button works', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /copy/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/copied/i)).toBeVisible();
  });

  test('preference toggles are interactive', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Toggle one
    await checkboxes.first().click();
    await page.waitForTimeout(200);
  });

  test('"Delete Account" shows confirmation', async ({ page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete account/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    // Cancel
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
  });
});
