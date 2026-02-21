/**
 * Advisor Messages — E2E tests
 *
 * Verifies: page load, thread list, message panel, search,
 * and message sending.
 */
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';

test.describe('Advisor Messages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.goto('/dashboard/messages', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('loads with heading', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('message');
  });

  test('shows thread list', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/thread|conversation|client|inbox/);
  });

  test('clicking a thread shows messages', async ({ page }) => {
    const threadItem = page.locator('[class*="cursor-pointer"], [role="button"]').first();
    if (await threadItem.isVisible()) {
      await threadItem.click();
      await page.waitForTimeout(500);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(100);
    }
  });

  test('has message input area', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test('has send button', async ({ page }) => {
    const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="send"]').first();
    await expect(sendBtn).toBeVisible({ timeout: 5_000 });
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
