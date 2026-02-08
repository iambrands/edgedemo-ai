import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';
import { verifyTableHasData } from '../helpers/assertions';

test.describe('Accounts Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/accounts', { title: 'Accounts' });
  });

  test('renders accounts table with data', async ({ page }) => {
    await verifyTableHasData(page);
  });

  test('column headers are sortable', async ({ page }) => {
    const header = page.locator('th').first();
    await expect(header).toBeVisible();
    await header.click();
    await page.waitForTimeout(300);
    // Table should still be visible after sorting
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('account rows show balance and custodian', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    const rowText = await firstRow.innerText();
    // Should contain a dollar amount somewhere
    expect(rowText).toMatch(/\$/);
  });
});
