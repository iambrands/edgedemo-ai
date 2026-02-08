import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Compliance Page — 5 Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await navigateAndVerify(page, '/dashboard/compliance', { title: 'Compliance' });
  });

  const TABS = ['Overview', 'Alerts', 'Reviews', 'Tasks', 'Audit'];

  for (const tabName of TABS) {
    test(`"${tabName}" tab loads content`, async ({ page }) => {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
      if (await tab.count() > 0) {
        await tab.first().click();
        await page.waitForTimeout(800);
        const body = await page.locator('body').innerText();
        expect(body.length).toBeGreaterThan(50);
      }
    });
  }

  test('compliance score is visible on overview', async ({ page }) => {
    await expect(page.getByText(/compliance score/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('metric cards render on overview tab', async ({ page }) => {
    // Look for stat values (numbers)
    const cards = page.locator('[class*="rounded-xl"][class*="shadow-sm"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test('tasks tab has create task button', async ({ page }) => {
    const tasksTab = page.getByRole('button', { name: /tasks/i });
    await tasksTab.first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/new task/i).first()).toBeVisible();
  });
});
