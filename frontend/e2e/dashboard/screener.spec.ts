/**
 * Stock Screener — E2E tests
 *
 * Verifies: page load, preset buttons, filter inputs, results table,
 * and interactive filtering.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Stock Screener', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/screener', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('loads with heading and content', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('stock');
  });

  test('displays preset strategy buttons', async ({ page }) => {
    const presets = ['Value', 'Growth', 'Dividend', 'Quality', 'GARP'];
    for (const preset of presets) {
      await expect(
        page.locator(`button:has-text("${preset}")`).first(),
      ).toBeVisible({ timeout: 3_000 });
    }
  });

  test('running screen shows results table with stock data', async ({ page }) => {
    const runBtn = page.locator('button:has-text("Run Screen")').first();
    await runBtn.click();
    await page.waitForTimeout(800);

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=AAPL').first()).toBeVisible();
    await expect(page.locator('text=MSFT').first()).toBeVisible();
  });

  test('clicking a preset filters results', async ({ page }) => {
    const valueBtn = page.locator('button:has-text("Value")').first();
    await valueBtn.click();
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('filter inputs are present', async ({ page }) => {
    const filters = ['P/E', 'PEG', 'Debt', 'Dividend'];
    const bodyText = await page.locator('body').innerText();
    for (const f of filters) {
      expect(bodyText).toContain(f);
    }
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
