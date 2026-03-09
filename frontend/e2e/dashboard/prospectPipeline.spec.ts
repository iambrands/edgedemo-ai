import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';
import { collectConsoleErrors } from '../helpers/assertions';

test.describe('Prospect Pipeline (IMM-04)', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = collectConsoleErrors(page);
    await loginAsRIA(page);
    await page.route('**/api/v1/prospects/analytics/seed-milestone', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ active_clients: 12, target: 100, progress_pct: 12.0, projected_date: '2026-09-15' }),
      })
    );
  });

  test('Kanban board renders pipeline stages', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard/prospects', { title: 'Prospect' });
    const stages = ['Lead', 'Contacted', 'Qualified', 'Proposal Sent'];
    for (const stage of stages) {
      await expect(page.getByText(stage).first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('seed milestone tracker is visible', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard/prospects', { title: 'Prospect' });
    await expect(page.getByText(/seed/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('no uncaught JS errors', () => {
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
