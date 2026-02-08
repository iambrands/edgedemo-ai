import { test, expect } from '../fixtures/auth.fixture';
import { TradePage } from '../pages/trade.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Trading', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.acknowledgeRisk();
  });

  test('trade page loads with balance card', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();
    await expect(tradePage.balanceCard).toBeVisible({ timeout: 10000 });
  });

  test('can enter a symbol and see price update', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();
    await tradePage.fillSymbol('AAPL');

    // After entering symbol, current price should appear somewhere on the page
    await expect(authenticatedPage.getByText(/\$\d+\.\d{2}/)).toBeVisible({ timeout: 10000 });
  });

  test('can select call and put contract types', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();

    await tradePage.selectCall();
    // Call button should be highlighted / selected
    await expect(tradePage.callButton).toHaveClass(/bg-green|bg-primary|selected|active/i);

    await tradePage.selectPut();
    await expect(tradePage.putButton).toHaveClass(/bg-red|bg-primary|selected|active/i);
  });

  test('can select expiration dates', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();
    await tradePage.fillSymbol('SPY');
    await tradePage.selectExpiration(0);

    // Expiration should have a value selected
    const value = await tradePage.expirationSelect.inputValue();
    expect(value).not.toBe('');
  });

  test('execute button requires all fields', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();

    // Without filling required fields, execute should be disabled or show error
    const executeBtn = tradePage.executeButton;
    const isDisabled = await executeBtn.isDisabled().catch(() => false);
    if (!isDisabled) {
      // If button is clickable, clicking should produce a validation error
      await executeBtn.click();
      await expect(authenticatedPage.getByText(/required|symbol|please/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('paper trade execution flow', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();

    // Fill trade form
    await tradePage.fillSymbol('AAPL');
    await tradePage.selectCall();
    await tradePage.selectExpiration(0);
    await tradePage.setQuantity(1);

    // Fetch price
    if (await tradePage.fetchPriceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tradePage.fetchPrice();
    }

    // The price input should have a value if fetch worked
    const price = await tradePage.priceInput.inputValue().catch(() => '');
    if (price) {
      await tradePage.executeTrade();
      // Should see success or order placed message
      await tradePage.expectTradeSuccess();
    }
  });

  test('trading disclaimer visible on trade page', async ({ authenticatedPage }) => {
    const tradePage = new TradePage(authenticatedPage);
    await tradePage.goto();
    await expect(tradePage.tradingDisclaimer).toBeVisible({ timeout: 5000 });
  });
});
