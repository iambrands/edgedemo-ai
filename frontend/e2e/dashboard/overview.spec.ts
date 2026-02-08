import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';
import { verifyCardsRendered, collectConsoleErrors } from '../helpers/assertions';

test.describe('Dashboard Overview', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = collectConsoleErrors(page);
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard', { title: 'Dashboard' });
  });

  test('renders KPI stat cards', async ({ page }) => {
    const count = await verifyCardsRendered(page, 4);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('renders household table', async ({ page }) => {
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 8_000 });
    const rows = table.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('active alerts section visible', async ({ page }) => {
    await expect(page.getByText(/active alerts/i).first()).toBeVisible();
  });

  test('recent activity section visible', async ({ page }) => {
    await expect(page.getByText(/recent activity/i).first()).toBeVisible();
  });

  test('no uncaught JS errors', async () => {
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
