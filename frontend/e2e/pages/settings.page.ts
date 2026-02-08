import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly riskToleranceSelect: Locator;
  readonly defaultStrategySelect: Locator;
  readonly timezoneSelect: Locator;
  readonly saveButton: Locator;
  readonly resetBalanceButton: Locator;
  readonly feedbackButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.riskToleranceSelect = page.locator('#riskTolerance');
    this.defaultStrategySelect = page.locator('#defaultStrategy');
    this.timezoneSelect = page.locator('#timezone');
    this.saveButton = page.getByRole('button', { name: /save settings/i });
    this.resetBalanceButton = page.getByRole('button', { name: /reset to \$100,000/i });
    this.feedbackButton = page.getByRole('button', { name: /send feedback/i });
  }

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.riskToleranceSelect).toBeVisible({ timeout: 10000 });
  }

  async setRiskTolerance(value: 'low' | 'moderate' | 'high') {
    await this.riskToleranceSelect.selectOption(value);
  }

  async setDefaultStrategy(value: 'income' | 'balanced' | 'growth') {
    await this.defaultStrategySelect.selectOption(value);
  }

  async saveSettings() {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }
}
