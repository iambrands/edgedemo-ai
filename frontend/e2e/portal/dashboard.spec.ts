import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';
import { verifyCardsRendered } from '../helpers/assertions';

test.describe('Client Portal — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateAndVerify(page, '/portal/dashboard');
  });

  test('displays portfolio value', async ({ page }) => {
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/\$[\d,]+/);
  });

  test('renders dashboard cards', async ({ page }) => {
    await verifyCardsRendered(page, 1);
  });

  test('navigation sidebar/tabs are visible', async ({ page }) => {
    // Portal nav should have links
    const nav = page.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThan(0);
  });
});
