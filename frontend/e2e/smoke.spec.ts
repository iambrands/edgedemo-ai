/**
 * Smoke test — verifies every page in the app loads without crashing
 * or redirecting unexpectedly.
 *
 * Run:  npx playwright test smoke.spec.ts
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA, loginAsClient } from './helpers/auth';
import { RIA_PAGES, PORTAL_PAGES, PUBLIC_PAGES } from './fixtures/test-data';

/* ── Public pages (no auth) ─────────────────────────────────────── */

test.describe('Public Pages', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.path} loads`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const elements = await page.locator('body *').count();
      expect(elements, `${pg.path} rendered no elements`).toBeGreaterThan(3);
    });
  }
});

/* ── RIA Dashboard pages ────────────────────────────────────────── */

test.describe('RIA Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
  });

  for (const pg of RIA_PAGES) {
    test(`${pg.path} loads (auth OK, no crash)`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Auth gate passed — page stayed on a /dashboard route (not /login)
      expect(page.url(), `${pg.path} redirected to login`).toContain('/dashboard');

      // React rendered something (even a loading spinner counts)
      const elements = await page.locator('body *').count();
      expect(elements, `${pg.path} has no DOM elements`).toBeGreaterThan(3);
    });
  }
});

/* ── RIA Dashboard — heading verification (stricter) ────────────── */

test.describe('RIA Dashboard — Heading Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
  });

  const PAGES_WITH_HEADINGS = RIA_PAGES.filter((p) =>
    ['/dashboard', '/dashboard/households', '/dashboard/accounts', '/dashboard/analysis',
     '/dashboard/meetings', '/dashboard/prospects', '/dashboard/conversations',
     '/dashboard/model-portfolios', '/dashboard/alternative-assets', '/dashboard/settings',
    ].includes(p.path),
  );

  for (const pg of PAGES_WITH_HEADINGS) {
    test(`${pg.path} heading contains "${pg.title}"`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 5_000 });
      const text = await heading.innerText();
      expect(text.toLowerCase()).toContain(pg.title.toLowerCase());
    });
  }
});

/* ── Client Portal pages ────────────────────────────────────────── */

test.describe('Client Portal Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  for (const pg of PORTAL_PAGES) {
    test(`${pg.path} loads (auth OK, no crash)`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Should not redirect to login
      expect(page.url(), `${pg.path} redirected to login`).not.toContain('/portal/login');

      // Should render something
      const elements = await page.locator('body *').count();
      expect(elements, `${pg.path} has no DOM elements`).toBeGreaterThan(3);
    });
  }
});

/* ── Client Portal — heading verification (stricter) ────────────── */

test.describe('Client Portal — Heading Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  const PORTAL_WITH_HEADINGS = PORTAL_PAGES.filter((p) =>
    ['/portal/risk-profile', '/portal/meetings', '/portal/requests',
     '/portal/notifications', '/portal/assistant', '/portal/what-if',
     '/portal/tax', '/portal/beneficiaries', '/portal/settings',
    ].includes(p.path),
  );

  for (const pg of PORTAL_WITH_HEADINGS) {
    test(`${pg.path} heading contains "${pg.title}"`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 5_000 });
      const text = await heading.innerText();
      expect(text.toLowerCase()).toContain(pg.title.toLowerCase());
    });
  }
});
