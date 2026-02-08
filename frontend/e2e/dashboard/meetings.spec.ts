import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Meetings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/meetings', { title: 'Meeting' });
  });

  test('displays stat cards', async ({ page }) => {
    const stats = page.locator('[class*="rounded-xl"][class*="border"]');
    expect(await stats.count()).toBeGreaterThanOrEqual(4);
  });

  test('"New Meeting" button opens modal', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new meeting/i });
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(500);
    // Modal should appear
    await expect(page.getByText(/meeting title/i)).toBeVisible({ timeout: 3_000 });
    // Close
    const cancel = page.getByRole('button', { name: /cancel/i });
    if (await cancel.isVisible()) await cancel.click();
  });

  test('meeting list is visible', async ({ page }) => {
    const body = await page.locator('body').innerText();
    // Should have meeting-related content
    expect(body.toLowerCase()).toMatch(/meeting|transcript|analysis|upload/);
  });
});
