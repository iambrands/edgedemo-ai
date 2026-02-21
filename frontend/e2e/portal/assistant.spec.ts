/**
 * Detailed tests for the AI Financial Assistant page.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('AI Assistant Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/portal/assistant', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('displays welcome message from history', async ({ page }) => {
    await expect(page.locator('text=AI financial assistant').first()).toBeVisible();
  });

  test('chat input is visible', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    // Check placeholder
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toContain('accounts');
  });

  test('can send a message and receive response', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.fill('What is my balance?');
    await page.waitForTimeout(200);

    const sendBtn = page.locator('button[aria-label="Send message"]');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=$54,905').first()).toBeVisible({ timeout: 5000 });
  });

  test('suggested follow-ups appear after response', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.fill('What is my balance?');
    await page.waitForTimeout(200);

    const sendBtn = page.locator('button[aria-label="Send message"]');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    const chip = page.locator('button:has-text("Show my accounts"), button:has-text("View performance chart")').first();
    await expect(chip).toBeVisible({ timeout: 5000 });
  });
});
