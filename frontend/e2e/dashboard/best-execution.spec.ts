/**
 * Best Execution Monitoring — E2E tests
 *
 * Verifies: page load, summary cards, trade table, broker comparison,
 * and compliance attestation.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Best Execution Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/best-execution', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('loads with heading', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('execution');
  });

  test('shows summary metric cards', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/Price Improvement|Execution Quality|NBBO/i);
  });

  test('shows trade execution table', async ({ page }) => {
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 5_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/AAPL|MSFT|GOOGL/);
  });

  test('shows broker comparison section', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('broker');
  });

  test('shows compliance attestation section', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/compliance|attestation|review/);
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
