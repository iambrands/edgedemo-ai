import { Page, Locator, expect } from '@playwright/test';

export class PortfolioPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly totalPortfolioValue: Locator;
  readonly totalPnL: Locator;
  readonly winRate: Locator;
  readonly activePositionsCount: Locator;
  readonly refreshButton: Locator;
  readonly positionRows: Locator;
  readonly tradeHistorySection: Locator;
  readonly tradingDisclaimer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /portfolio/i });
    this.totalPortfolioValue = page.getByText(/total portfolio value/i);
    this.totalPnL = page.getByText(/total p\/l/i);
    this.winRate = page.getByText(/win rate/i);
    this.activePositionsCount = page.getByText(/active positions/i);
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    // Position rows in the active positions table
    this.positionRows = page.locator('table tbody tr, [class*="position"]');
    this.tradeHistorySection = page.getByText(/trade history/i);
    this.tradingDisclaimer = page.getByText(/risk disclosure/i);
  }

  async goto() {
    await this.page.goto('/portfolio');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async getPositionCount(): Promise<number> {
    await this.page.waitForTimeout(2000); // Wait for data
    return await this.positionRows.count();
  }

  async clickCloseOnPosition(index: number = 0) {
    const closeButtons = this.page.getByRole('button', { name: /close/i });
    const count = await closeButtons.count();
    if (count > index) {
      await closeButtons.nth(index).click();
    }
  }

  async confirmClose() {
    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }
}
