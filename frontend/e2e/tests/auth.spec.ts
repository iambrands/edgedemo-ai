import { test, expect, TEST_USER } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';

test.describe('Authentication', () => {
  // ── Login ──────────────────────────────────────────────

  test.describe('Login', () => {
    test('successful login redirects to dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.expectLoggedIn();
    });

    test('invalid credentials show error', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('wrong@email.com', 'wrongpassword');
      await loginPage.expectError(/invalid|incorrect|failed/i);
    });

    test('rate limiting blocks after repeated failures', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      for (let i = 0; i < 6; i++) {
        await loginPage.login(`ratelimit-${Date.now()}@test.com`, 'wrong');
        await page.waitForTimeout(300);
      }

      // After 5+ failures from same IP, should see rate limit or error
      await expect(
        page.getByText(/too many|rate limit|try again/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test('empty fields prevent submission', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginButton.click();

      // HTML5 validation or custom error should appear
      await expect(page.locator('#username:invalid, .error, [class*="error"]')).toBeVisible({
        timeout: 3000,
      });
    });

    test('login page has link to register', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await expect(loginPage.registerLink).toBeVisible();
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/register/);
    });
  });

  // ── Registration ───────────────────────────────────────

  test.describe('Registration', () => {
    test('successful registration with valid beta code', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const ts = Date.now();
      await registerPage.register(
        `e2euser${ts}`,
        `e2e-${ts}@optionsedge.ai`,
        'ValidPassword123!',
        TEST_USER.betaCode
      );
      await registerPage.expectRegistrationSuccess();
    });

    test('registration requires terms acceptance', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.usernameInput.fill('testuser');
      await registerPage.emailInput.fill('test@test.com');
      await registerPage.passwordInput.fill('ValidPassword123!');
      await registerPage.confirmPasswordInput.fill('ValidPassword123!');
      await registerPage.betaCodeInput.fill(TEST_USER.betaCode);
      // Do NOT check terms
      await registerPage.registerButton.click();

      // Should see validation error or button disabled behavior
      await expect(page).not.toHaveURL(/dashboard/, { timeout: 3000 });
    });

    test('invalid beta code shows error', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const ts = Date.now();
      await registerPage.register(
        `badcode${ts}`,
        `badcode-${ts}@optionsedge.ai`,
        'ValidPassword123!',
        'INVALIDCODE999'
      );
      await registerPage.expectError(/invalid beta code/i);
    });

    test('duplicate email shows error', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.register(
        `duplicate${Date.now()}`,
        TEST_USER.email, // existing user
        'ValidPassword123!',
        TEST_USER.betaCode
      );
      await registerPage.expectError(/already exists|already registered/i);
    });

    test('register page has link to login', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const loginLink = page.getByText(/sign in to your account/i);
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    });
  });

  // ── Logout ─────────────────────────────────────────────

  test.describe('Logout', () => {
    test('logout redirects to login page', async ({ authenticatedPage }) => {
      // Look for logout button in sidebar or dropdown
      const logoutBtn = authenticatedPage.getByRole('button', { name: /logout|sign out/i });
      const logoutLink = authenticatedPage.getByRole('link', { name: /logout|sign out/i });

      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click();
      } else if (await logoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutLink.click();
      }

      await expect(authenticatedPage).toHaveURL(/login|landing|\/$/, { timeout: 10000 });
    });
  });
});
