import { test, expect } from '@playwright/test';

const MARKETING_PAGES = ['/', '/features', '/pricing', '/updates'];

test.describe('Marketing site', () => {
  for (const path of MARKETING_PAGES) {
    test(`${path} renders marketing nav and footer`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('navigation').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Features' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Pricing' }).first()).toBeVisible();
    });
  }

  test('landing shows 30-day free trial CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/30[- ]day free trial/i).first()).toBeVisible();
  });

  test('footer links resolve', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Our Technology' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Data Retention' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Product Updates' })).toBeVisible();
  });
});
