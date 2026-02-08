import { Page, Locator, expect } from '@playwright/test';

export class TradePage {
  readonly page: Page;
  readonly symbolInput: Locator;
  readonly buyButton: Locator;
  readonly sellButton: Locator;
  readonly callButton: Locator;
  readonly putButton: Locator;
  readonly expirationSelect: Locator;
  readonly strikeInput: Locator;
  readonly quantityInput: Locator;
  readonly priceInput: Locator;
  readonly fetchPriceButton: Locator;
  readonly executeButton: Locator;
  readonly balanceCard: Locator;
  readonly tradingDisclaimer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.symbolInput = page.locator('input[name="symbol"]');
    this.buyButton = page.getByRole('button', { name: /^buy$/i });
    this.sellButton = page.getByRole('button', { name: /^sell$/i });
    this.callButton = page.getByRole('button', { name: /^call$/i });
    this.putButton = page.getByRole('button', { name: /^put$/i });
    this.expirationSelect = page.locator('select[name="expiration"]');
    this.strikeInput = page.locator('input[name="strike"]');
    this.quantityInput = page.locator('input[name="quantity"]');
    this.priceInput = page.locator('input[name="price"]');
    this.fetchPriceButton = page.getByRole('button', { name: /fetch/i });
    this.executeButton = page.getByRole('button', { name: /execute|buy.*contract|sell.*contract/i });
    this.balanceCard = page.getByText(/paper trading balance|live trading/i);
    this.tradingDisclaimer = page.getByText(/risk disclosure/i);
  }

  async goto() {
    await this.page.goto('/trade');
    await this.page.waitForLoadState('networkidle');
  }

  async fillSymbol(symbol: string) {
    await this.symbolInput.fill(symbol);
    // Wait for price to load
    await this.page.waitForTimeout(2000);
  }

  async selectCall() {
    await this.callButton.click();
  }

  async selectPut() {
    await this.putButton.click();
  }

  async selectExpiration(index: number = 0) {
    const options = this.expirationSelect.locator('option');
    const count = await options.count();
    if (count > index + 1) {
      // Skip the first placeholder option
      const value = await options.nth(index + 1).getAttribute('value');
      if (value) {
        await this.expirationSelect.selectOption(value);
      }
    }
  }

  async setQuantity(qty: number) {
    await this.quantityInput.fill(qty.toString());
  }

  async setStrike(strike: string) {
    await this.strikeInput.fill(strike);
  }

  async fetchPrice() {
    await this.fetchPriceButton.click();
    await this.page.waitForTimeout(2000);
  }

  async executeTrade() {
    await this.executeButton.click();
  }

  async expectTradeSuccess() {
    await expect(
      this.page.getByText(/success|order.*placed|trade.*executed/i)
    ).toBeVisible({ timeout: 10000 });
  }

  async expectTradeError(pattern?: RegExp) {
    const errorPattern = pattern || /error|failed|halted|limit|exceeds/i;
    await expect(this.page.getByText(errorPattern)).toBeVisible({ timeout: 10000 });
  }
}
