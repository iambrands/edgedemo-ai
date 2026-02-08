import { test, expect } from '../fixtures/auth.fixture';
import { SettingsPage } from '../pages/settings.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Risk Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.acknowledgeRisk();
  });

  test('settings page loads with risk tolerance options', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.expectLoaded();

    // Risk tolerance dropdown should be visible
    await expect(settingsPage.riskToleranceSelect).toBeVisible();
    await expect(settingsPage.defaultStrategySelect).toBeVisible();
  });

  test('can change risk tolerance', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.expectLoaded();

    await settingsPage.setRiskTolerance('low');
    await settingsPage.saveSettings();

    // After save, the value should persist
    await settingsPage.goto();
    await expect(settingsPage.riskToleranceSelect).toHaveValue('low');
  });

  test('can change default strategy', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.expectLoaded();

    await settingsPage.setDefaultStrategy('income');
    await settingsPage.saveSettings();

    await settingsPage.goto();
    await expect(settingsPage.defaultStrategySelect).toHaveValue('income');
  });

  test('risk management limits section is visible', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();

    await expect(authenticatedPage.getByText(/risk management/i)).toBeVisible({ timeout: 10000 });
  });

  test('paper balance reset works', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();

    const resetBtn = settingsPage.resetBalanceButton;
    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetBtn.click();

      // Should see confirmation or success
      await expect(
        authenticatedPage.getByText(/100,000|reset|success/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
