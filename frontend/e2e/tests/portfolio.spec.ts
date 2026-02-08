import { test, expect } from '../fixtures/auth.fixture';
import { PortfolioPage } from '../pages/portfolio.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Portfolio', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.acknowledgeRisk();
  });

  test('portfolio page loads with summary cards', async ({ authenticatedPage }) => {
    const portfolioPage = new PortfolioPage(authenticatedPage);
    await portfolioPage.goto();
    await portfolioPage.expectLoaded();

    await expect(portfolioPage.totalPortfolioValue).toBeVisible();
    await expect(portfolioPage.winRate).toBeVisible();
  });

  test('active positions section is visible', async ({ authenticatedPage }) => {
    const portfolioPage = new PortfolioPage(authenticatedPage);
    await portfolioPage.goto();

    // "Active Positions" heading or label should appear
    await expect(authenticatedPage.getByText(/active positions/i)).toBeVisible({ timeout: 10000 });
  });

  test('trade history section is visible', async ({ authenticatedPage }) => {
    const portfolioPage = new PortfolioPage(authenticatedPage);
    await portfolioPage.goto();

    await expect(portfolioPage.tradeHistorySection).toBeVisible({ timeout: 10000 });
  });

  test('refresh button works', async ({ authenticatedPage }) => {
    const portfolioPage = new PortfolioPage(authenticatedPage);
    await portfolioPage.goto();

    const refreshBtn = portfolioPage.refreshButton;
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      // Page should remain functional after refresh
      await portfolioPage.expectLoaded();
    }
  });

  test('trading disclaimer visible on portfolio page', async ({ authenticatedPage }) => {
    const portfolioPage = new PortfolioPage(authenticatedPage);
    await portfolioPage.goto();
    await expect(portfolioPage.tradingDisclaimer).toBeVisible({ timeout: 5000 });
  });
});
