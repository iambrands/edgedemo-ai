/**
 * Detailed tests for the Meeting Scheduler page.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('Meetings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/portal/meetings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('displays upcoming meetings section', async ({ page }) => {
    await expect(page.locator('text=Upcoming Meetings')).toBeVisible();
  });

  test('shows mock meeting data', async ({ page }) => {
    await expect(page.locator('text=Portfolio Review')).toBeVisible();
  });

  test('shows advisor contact info', async ({ page }) => {
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
  });

  test('schedule meeting button opens booking flow', async ({ page }) => {
    const scheduleBtn = page.locator('button:has-text("Schedule Meeting")');
    await expect(scheduleBtn).toBeVisible();
    await scheduleBtn.click();
    await page.waitForTimeout(1000);

    // Should show meeting type selection step
    await expect(page.locator('text=What would you like to discuss?')).toBeVisible();
  });

  test('booking flow: type selection shows meeting types', async ({ page }) => {
    const scheduleBtn = page.locator('button:has-text("Schedule Meeting")');
    await expect(scheduleBtn).toBeVisible();
    await scheduleBtn.click();
    await page.waitForTimeout(1000);

    // Should see meeting types from mock data
    await expect(page.locator('text=Portfolio Review').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Financial Planning')).toBeVisible({ timeout: 5000 });
  });
});
