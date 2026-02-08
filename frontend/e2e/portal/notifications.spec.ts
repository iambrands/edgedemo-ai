/**
 * Detailed tests for the Notifications Center page.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('Notifications Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/portal/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('displays notifications list', async ({ page }) => {
    await expect(page.locator('text=New Document Available')).toBeVisible();
    await expect(page.locator('text=Action Required')).toBeVisible();
  });

  test('shows unread count', async ({ page }) => {
    // Mock has 2 unread notifications
    await expect(page.locator('text=2 unread')).toBeVisible();
  });

  test('filter tabs are visible', async ({ page }) => {
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Unread")').first()).toBeVisible();
  });

  test('unread filter shows only unread items', async ({ page }) => {
    await page.click('button:has-text("Unread")');
    await page.waitForTimeout(300);

    // Unread: "New Document Available" and "Action Required"
    await expect(page.locator('text=New Document Available')).toBeVisible();
    await expect(page.locator('text=Action Required')).toBeVisible();
    // "Upcoming Meeting" is read, should not appear
    await expect(page.locator('text=Upcoming Meeting')).not.toBeVisible();
  });

  test('mark all read button works', async ({ page }) => {
    const markAllBtn = page.locator('button:has-text("Mark all read")');
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();
    await page.waitForTimeout(1000);

    // After marking all read, unread count should be 0 → "All caught up!"
    await expect(page.locator('text=All caught up')).toBeVisible({ timeout: 5000 });
  });
});
