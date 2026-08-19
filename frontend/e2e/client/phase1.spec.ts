/**
 * B2C-108 — Phase 1 E2E smoke tests for DIY client features.
 *
 * Run:  npx playwright test e2e/client/phase1.spec.ts
 */
import { test, expect } from '@playwright/test';
import { loginAsB2CUser, setupB2CApiMocks } from '../helpers/auth';

test.describe('B2C Phase 1 — Client flows', () => {
  test('login flow navigates to dashboard', async ({ page }) => {
    await setupB2CApiMocks(page);

    await page.goto('/client/signup', { waitUntil: 'domcontentloaded' });

    // Switch to sign-in mode
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.getByLabel('Email').fill('demo@b2c.test');
    await page.getByLabel('Password').fill('Demo1234!');
    await page.locator('form button[type="submit"]').click();

    await page.waitForURL(/\/client\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/client/dashboard');
  });

  test('dashboard renders net worth hero', async ({ page }) => {
    await loginAsB2CUser(page);

    await expect(page.getByText('Net Worth', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('$125,000')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Moderate Growth')).toBeVisible();
  });

  test('nav shell links work — Accounts, Retirement, Spending, Budgets', async ({ page }) => {
    await loginAsB2CUser(page);

    const nav = page.locator('aside nav');

    const expandGroup = async (name: string) => {
      const btn = nav.getByRole('button', { name, exact: true });
      if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
    };

    await expandGroup('Money');
    await nav.getByRole('link', { name: 'Accounts' }).click();
    await page.waitForURL(/\/client\/statements/);
    await expect(page.getByRole('heading', { name: /Statement history/i })).toBeVisible();

    await expandGroup('Plan');
    await nav.getByRole('link', { name: 'Retirement' }).click();
    await page.waitForURL(/\/client\/retirement/);
    await expect(page.getByRole('heading', { name: /Retirement planner/i })).toBeVisible();

    await expandGroup('Money');
    await nav.getByRole('link', { name: 'Spending' }).click();
    await page.waitForURL(/\/client\/spending/);
    await expect(page.getByRole('heading', { name: 'Spending', exact: true })).toBeVisible();

    await expandGroup('Money');
    await nav.getByRole('link', { name: 'Budgets' }).click();
    await page.waitForURL(/\/client\/budgets/);
    await expect(page.getByRole('heading', { name: 'Budgets', exact: true })).toBeVisible();
  });

  test('onboarding wizard renders first step', async ({ page }) => {
    await setupB2CApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('firmum_b2c_token', 'e2e-b2c-test-token');
      localStorage.setItem('firmum_b2c_refresh_token', 'e2e-b2c-refresh-token');
      localStorage.removeItem('firmum_onboarding_step');
      localStorage.removeItem('firmum_onboarding_done');
    });

    await page.goto('/client/onboarding', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Connect your accounts' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Read-only access — we can never move your money')).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect account/i })).toBeVisible();
  });

  test('goals page loads with mock data', async ({ page }) => {
    await loginAsB2CUser(page);

    await page.goto('/client/goals', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('heading', { name: 'Retire by 2040' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Emergency Fund' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Europe Trip' })).toBeVisible();
  });

  test('investments hub shows THETARA and Bullara cards', async ({ page }) => {
    await loginAsB2CUser(page);

    const nav = page.locator('aside nav');
    const expandGroup = async (name: string) => {
      const btn = nav.getByRole('button', { name, exact: true });
      if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
    };

    await expandGroup('Investments');
    await nav.getByRole('link', { name: 'Overview' }).click();
    await page.waitForURL(/\/client\/investments/);

    await expect(page.getByRole('heading', { name: 'Investments', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'THETARA' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bullara' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open THETARA/i })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /Open Bullara/i })).toHaveAttribute('target', '_blank');

    // External nav links should open in new tabs
    const thetaraNavLink = nav.getByRole('link', { name: 'THETARA Options' });
    await expect(thetaraNavLink).toHaveAttribute('target', '_blank');
    const bullaraNavLink = nav.getByRole('link', { name: 'Bullara Stocks' });
    await expect(bullaraNavLink).toHaveAttribute('target', '_blank');
  });
});
