import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

// Test user credentials — set via env vars or use defaults.
// The e2e test user must exist in the target environment.
export const TEST_USER = {
  username: process.env.E2E_TEST_USERNAME || 'e2e-testuser',
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@optionsedge.ai',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
  betaCode: process.env.E2E_BETA_CODE || 'FRIENDS50',
};

export const ADMIN_USER = {
  email: process.env.ADMIN_EMAIL || 'leslie.wilson@iambrands.com',
  password: process.env.ADMIN_PASSWORD || '',
};

type AuthFixtures = {
  authenticatedPage: Page;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await loginPage.expectLoggedIn();

    // Handle risk acknowledgment if it appears
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.acknowledgeRisk();

    await use(page);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
