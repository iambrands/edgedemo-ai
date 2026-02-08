/**
 * Smoke tests for all new Tier 2 & Tier 3 portal pages.
 * Verifies each page loads, renders expected heading, and has meaningful content.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

const NEW_PORTAL_PAGES = [
  // Tier 2
  { path: '/portal/performance', heading: /performance/i },
  { path: '/portal/meetings', heading: /meeting/i },
  { path: '/portal/requests', heading: /request/i },
  { path: '/portal/notifications', heading: /notification/i },
  // Tier 3
  { path: '/portal/assistant', heading: /assistant/i },
  { path: '/portal/what-if', heading: /what/i },
  { path: '/portal/tax', heading: /tax/i },
  { path: '/portal/beneficiaries', heading: /beneficiar/i },
  { path: '/portal/family', heading: /family/i },
];

test.describe('New Portal Pages — Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  for (const { path, heading } of NEW_PORTAL_PAGES) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Page should not show error boundary
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();

      // Should not redirect to login
      expect(page.url()).not.toContain('/portal/login');

      // Should have a heading matching the expected pattern
      const h = page.locator('h1, h2').first();
      await expect(h).toBeVisible({ timeout: 5_000 });
      const text = await h.innerText();
      expect(text).toMatch(heading);
    });

    test(`${path} has meaningful content`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const body = await page.locator('body').innerText();
      expect(body.trim().length).toBeGreaterThan(100);
    });
  }
});
