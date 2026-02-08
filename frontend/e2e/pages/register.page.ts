import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly betaCodeInput: Locator;
  readonly termsCheckbox: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.betaCodeInput = page.locator('#betaCode');
    this.termsCheckbox = page.locator('#agreeToTerms');
    this.registerButton = page.getByRole('button', { name: /create account/i });
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(
    username: string,
    email: string,
    password: string,
    betaCode: string = 'FRIENDS50'
  ) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.betaCodeInput.fill(betaCode);
    await this.termsCheckbox.check();
    await this.registerButton.click();
  }

  async expectRegistrationSuccess() {
    // After registration the app redirects to dashboard (risk modal may appear)
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 15000 });
  }

  async expectError(messagePattern: string | RegExp) {
    const pattern =
      typeof messagePattern === 'string' ? new RegExp(messagePattern, 'i') : messagePattern;
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 5000 });
  }
}
