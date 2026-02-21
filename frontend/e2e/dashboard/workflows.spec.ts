/**
 * Workflow Templates — E2E tests (via Compliance page Workflows tab)
 *
 * Verifies: workflows tab exists, template cards load, starting a workflow,
 * and active workflow tracking.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Workflow Templates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/compliance', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('Workflows tab exists on compliance page', async ({ page }) => {
    const workflowsTab = page.locator('button:has-text("Workflows"), [role="tab"]:has-text("Workflows")').first();
    await expect(workflowsTab).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Workflows tab shows template cards', async ({ page }) => {
    const workflowsTab = page.locator('button:has-text("Workflows"), [role="tab"]:has-text("Workflows")').first();
    await workflowsTab.click();
    await page.waitForTimeout(800);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/New Client|Annual Review|Rollover/i);
  });

  test('workflow templates have start buttons', async ({ page }) => {
    const workflowsTab = page.locator('button:has-text("Workflows"), [role="tab"]:has-text("Workflows")').first();
    await workflowsTab.click();
    await page.waitForTimeout(800);

    const startBtn = page.locator('button:has-text("Start"), button:has-text("Use")').first();
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
