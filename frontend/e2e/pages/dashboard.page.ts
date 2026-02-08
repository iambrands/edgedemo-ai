import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly balanceCard: Locator;
  readonly totalPositions: Locator;
  readonly unrealizedPnL: Locator;
  readonly realizedPnL: Locator;
  readonly winRate: Locator;
  readonly tradingDisclaimer: Locator;
  readonly riskModal: Locator;
  readonly refreshButton: Locator;
  readonly activePositionsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.balanceCard = page.getByText(/paper trading balance/i);
    this.totalPositions = page.getByText(/total positions/i);
    this.unrealizedPnL = page.getByText(/unrealized p\/l/i);
    this.realizedPnL = page.getByText(/realized p\/l/i);
    this.winRate = page.getByText(/win rate/i);
    this.tradingDisclaimer = page.getByText(/risk disclosure/i);
    this.riskModal = page.getByText(/risk acknowledgment/i);
    this.refreshButton = page.getByRole('button', { name: /refresh prices/i });
    this.activePositionsSection = page.getByText(/active positions/i);
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async expectTradingDisclaimer() {
    await expect(this.tradingDisclaimer).toBeVisible({ timeout: 5000 });
  }

  async dismissDisclaimer() {
    const closeBtn = this.page.locator('button[aria-label="Dismiss disclaimer"]');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    }
  }

  async acknowledgeRisk() {
    // Wait briefly for the risk modal to appear
    const modalVisible = await this.page
      .getByText(/risk acknowledgment/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!modalVisible) return;

    // Check all checkboxes inside the modal
    const checkboxes = this.page.locator(
      'input[type="checkbox"]:not(#agreeToTerms):not(#rememberMe)'
    );
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) {
        await cb.check();
      }
    }

    // Click accept / I Understand button
    const acceptBtn = this.page.getByRole('button', { name: /accept|i understand|agree/i });
    await acceptBtn.click();
    // Wait for modal to close
    await this.page.waitForTimeout(1000);
  }
}
