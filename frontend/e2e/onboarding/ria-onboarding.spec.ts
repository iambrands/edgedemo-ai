import { test, expect } from '@playwright/test';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('RIA Onboarding', () => {
  test('onboarding page loads', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(50);
  });

  test('help center loads', async ({ page }) => {
    await navigateAndVerify(page, '/help', { title: 'Help' });
  });
});
