import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {
  test('Terms of Service page loads without authentication', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByText(/acceptance of terms/i)).toBeVisible();
  });

  test('Privacy Policy page loads without authentication', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/information we collect/i)).toBeVisible();
  });

  test('Terms page contains critical sections', async ({ page }) => {
    await page.goto('/terms');

    const criticalSections = [
      /acceptance of terms/i,
      /description of service/i,
      /investment disclaimers/i,
      /not investment advice/i,
      /ai-generated content/i,
      /limitation of liability/i,
      /disclaimer of warranties/i,
      /dispute resolution/i,
    ];

    for (const section of criticalSections) {
      await expect(page.getByText(section).first()).toBeVisible();
    }
  });

  test('Privacy page contains critical sections', async ({ page }) => {
    await page.goto('/privacy');

    const criticalSections = [
      /information we collect/i,
      /how we use/i,
      /data security/i,
      /data retention/i,
      /your rights/i,
    ];

    for (const section of criticalSections) {
      await expect(page.getByText(section).first()).toBeVisible();
    }
  });

  test('Audit log page requires authentication', async ({ page }) => {
    await page.goto('/audit-log');
    // Should redirect to login since it requires auth
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('Health check page is publicly accessible', async ({ page }) => {
    await page.goto('/health');
    await expect(page).toHaveURL(/health/);
  });
});
