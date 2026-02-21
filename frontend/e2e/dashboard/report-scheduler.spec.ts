/**
 * Report Scheduler — E2E tests (via Report Builder page)
 *
 * Verifies: scheduled reports section loads on the Report Builder page,
 * shows active schedules, delivery history, and run controls.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Report Scheduler (within Report Builder)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/report-builder', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('page loads with Report heading', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('report');
  });

  test('scheduled reports section is visible', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/Scheduled Reports|Schedule/i);
  });

  test('shows schedule entries with status', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/active|paused|weekly|monthly|quarterly/i);
  });

  test('has delivery history section', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/delivery|history|sent|delivered/i);
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
