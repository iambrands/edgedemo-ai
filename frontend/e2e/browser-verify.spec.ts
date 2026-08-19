/**
 * One-shot browser verification against a running server.
 * Run: TEST_URL=http://localhost:5006 npx playwright test browser-verify.spec.ts
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const OUT = path.join(process.cwd(), 'browser-verify-screenshots');

test.describe('Live browser verification', () => {
  test('marketing pages render key content', async ({ page }) => {
    const pages = [
      { url: '/', must: /30.day|free trial|Firmum/i },
      { url: '/features', must: /feature|tool|platform/i },
      { url: '/pricing', must: /pricing|plan|trial/i },
      { url: '/updates', must: /update|release|product/i },
    ];

    for (const pg of pages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const text = await page.locator('body').innerText();
      expect(text, pg.url).toMatch(pg.must);
      await page.screenshot({ path: path.join(OUT, `${pg.url.replace(/\//g, '_') || 'home'}.png`), fullPage: false });
    }
  });

  test('RIA login and dashboard access', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder(/enter your email/i).fill('leslie@iabadvisors.com');
    await page.getByPlaceholder(/enter your password/i).fill('CreateWEalth2024$');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(OUT, 'dashboard.png'), fullPage: false });

    await page.goto('/dashboard/accounts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/account/i);
    await page.screenshot({ path: path.join(OUT, 'accounts.png'), fullPage: false });
  });
});
