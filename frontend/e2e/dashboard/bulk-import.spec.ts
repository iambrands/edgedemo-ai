/**
 * Bulk Import — E2E tests
 *
 * Verifies: page load, file drop zone, template download, sample data,
 * validation, and import flow.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Bulk Client Import', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/bulk-import', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('loads with heading', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('bulk');
  });

  test('shows CSV upload area', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/csv|upload|drop|import/);
  });

  test('has template download and sample data buttons', async ({ page }) => {
    const templateBtn = page.locator('button:has-text("Template"), button:has-text("template"), button:has-text("Download")').first();
    await expect(templateBtn).toBeVisible({ timeout: 5_000 });

    const sampleBtn = page.locator('button:has-text("Sample"), button:has-text("sample")').first();
    await expect(sampleBtn).toBeVisible({ timeout: 5_000 });
  });

  test('loading sample data shows preview table', async ({ page }) => {
    const sampleBtn = page.locator('button:has-text("Sample"), button:has-text("sample")').first();
    await sampleBtn.click();
    await page.waitForTimeout(800);

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 5_000 });
  });

  test('sample data shows validation summary', async ({ page }) => {
    const sampleBtn = page.locator('button:has-text("Sample"), button:has-text("sample")').first();
    await sampleBtn.click();
    await page.waitForTimeout(800);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/valid|ready|row/);
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
