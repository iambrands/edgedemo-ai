import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.getByRole('button', { name: /sign in/i });
    this.rememberMeCheckbox = page.locator('#rememberMe');
    this.registerLink = page.getByText(/create an account/i);
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(usernameOrEmail: string, password: string) {
    await this.usernameInput.fill(usernameOrEmail);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(messagePattern: string | RegExp) {
    const pattern = typeof messagePattern === 'string' ? new RegExp(messagePattern, 'i') : messagePattern;
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 5000 });
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 15000 });
  }
}
