import { test, expect, TEST_USER } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { RegisterPage } from '../pages/register.page';

test.describe('User Onboarding', () => {
  test('new user sees risk acknowledgment modal after registration', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const ts = Date.now();
    await registerPage.register(
      `onboard${ts}`,
      `onboard-${ts}@optionsedge.ai`,
      'ValidPassword123!',
      TEST_USER.betaCode
    );

    // After registration, risk acknowledgment modal should appear
    await expect(page.getByText(/risk acknowledgment/i)).toBeVisible({ timeout: 15000 });
  });

  test('risk modal requires all checkboxes before accepting', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const ts = Date.now();
    await registerPage.register(
      `riskcheck${ts}`,
      `riskcheck-${ts}@optionsedge.ai`,
      'ValidPassword123!',
      TEST_USER.betaCode
    );

    // Wait for modal
    await expect(page.getByText(/risk acknowledgment/i)).toBeVisible({ timeout: 15000 });

    // Accept button should be disabled initially
    const acceptBtn = page.getByRole('button', { name: /accept|i understand|agree/i });
    await expect(acceptBtn).toBeDisabled();

    // Check all checkboxes
    const checkboxes = page.locator(
      'input[type="checkbox"]:not(#agreeToTerms):not(#rememberMe)'
    );
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3); // Should have multiple risk checkboxes

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // Now accept button should be enabled
    await expect(acceptBtn).toBeEnabled();
    await acceptBtn.click();

    // Modal should close
    await expect(page.getByText(/risk acknowledgment/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('trading disclaimer banner appears on dashboard', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.expectTradingDisclaimer();
  });

  test('trading disclaimer appears on trade page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/trade');
    await expect(authenticatedPage.getByText(/risk disclosure/i)).toBeVisible({ timeout: 5000 });
  });

  test('trading disclaimer appears on portfolio page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portfolio');
    await expect(authenticatedPage.getByText(/risk disclosure/i)).toBeVisible({ timeout: 5000 });
  });

  test('disclaimer can be dismissed per session', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.expectTradingDisclaimer();

    await dashboardPage.dismissDisclaimer();

    // Should be hidden now
    await expect(authenticatedPage.getByText(/risk disclosure/i)).not.toBeVisible({
      timeout: 3000,
    });

    // Navigate away and back — should stay dismissed (sessionStorage)
    await authenticatedPage.goto('/portfolio');
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage.getByText(/risk disclosure/i)).not.toBeVisible({
      timeout: 3000,
    });
  });
});
