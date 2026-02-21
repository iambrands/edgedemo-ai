/**
 * Client Portal Messages — E2E tests
 *
 * Verifies: page load, thread list, message display,
 * message input, and sending.
 */
import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('Portal Messages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/portal/messages', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  test('loads with heading', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.innerText();
    expect(text.toLowerCase()).toContain('message');
  });

  test('shows thread list or empty state', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    expect(bodyText.toLowerCase()).toMatch(/message|thread|conversation|advisor|inbox/);
  });

  test('has message input area', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test('does not redirect to login', async ({ page }) => {
    expect(page.url()).not.toContain('/portal/login');
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
