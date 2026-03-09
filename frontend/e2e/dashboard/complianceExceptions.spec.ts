import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Compliance Exceptions (IMM-03)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.route('**/api/v1/compliance/exceptions', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'exc-001', rule_code: 'IA206_FIDUCIARY', category: 'FIDUCIARY_DUTY', severity: 'WARNING', message: 'Portfolio drift 11.2%', client_name: 'Mark Henderson', triggered_at: new Date().toISOString(), resolved: false },
          { id: 'exc-002', rule_code: 'SERIES65_SUITABILITY', category: 'SUITABILITY', severity: 'BLOCKING', message: 'Options for conservative profile', client_name: 'Nicole Wilson', triggered_at: new Date().toISOString(), resolved: false },
        ]),
      })
    );
  });

  test('exception panel renders on compliance page', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard/compliance', { title: 'Compliance' });
    await expect(page.getByText(/compliance exceptions/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('blocking severity shown', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard/compliance', { title: 'Compliance' });
    await expect(page.getByText(/blocking/i).first()).toBeVisible({ timeout: 8000 });
  });
});
