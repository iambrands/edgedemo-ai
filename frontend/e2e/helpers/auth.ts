import { Page } from '@playwright/test';

const FAKE_RIA_USER = {
  id: 'test-ria-001',
  email: 'advisor@edgeai.test',
  firstName: 'Test',
  lastName: 'Advisor',
  role: 'ria',
  firm: 'EdgeAI Demo',
  crd: '123456',
  state: 'CA',
  licenses: ['Series 65'],
};

/**
 * Mock all APIs and seed RIA auth token.
 *
 * IMPORTANT: Playwright checks routes in reverse-registration order
 * (last added → checked first).  We register the catch-all FIRST so
 * that the specific /auth/me route (registered later) takes priority.
 */
export async function loginAsRIA(page: Page) {
  // ── 1) Catch-all  (registered first → lowest priority) ──────────
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: [], items: [], results: [] }),
    }),
  );

  // ── 2) Specific mocks  (registered after → higher priority) ─────
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_RIA_USER),
    }),
  );

  await page.route('**/api/v1/ria/dashboard/summary', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kpis: { totalAUM: 24500000, householdCount: 12, accountCount: 34, alertCount: 3 },
        alerts: [
          { id: '1', message: 'High concentration in AAPL', severity: 'high', date: '2026-02-04' },
          { id: '2', message: 'Henderson rebalance overdue', severity: 'medium', date: '2026-02-03' },
        ],
        recentActivity: [
          { id: '1', action: 'Portfolio Analysis', detail: 'Wilson Household', date: '2026-02-04' },
          { id: '2', action: 'Fee Review', detail: 'Henderson Family', date: '2026-02-03' },
        ],
        households: [
          { id: 'hh-001', name: 'Wilson', members: ['John', 'Jane'], totalValue: 2450000, accounts: 4, riskScore: 62, status: 'attention', lastAnalysis: '2026-02-04' },
          { id: 'hh-002', name: 'Henderson', members: ['Robert'], totalValue: 1800000, accounts: 3, riskScore: 35, status: 'rebalance', lastAnalysis: '2026-01-28' },
          { id: 'hh-003', name: 'Martinez', members: ['Maria'], totalValue: 950000, accounts: 2, riskScore: 28, status: 'good', lastAnalysis: '2026-01-30' },
          { id: 'hh-004', name: 'Patel', members: ['Raj'], totalValue: 3100000, accounts: 5, riskScore: 45, status: 'good', lastAnalysis: '2026-02-01' },
        ],
      }),
    }),
  );

  await page.route('**/api/v1/ria/households**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'hh-001', name: 'Wilson Household', members: ['John', 'Jane'], totalValue: 2450000, accounts: [{ id: 'a1', name: 'Joint Brokerage', custodian: 'Schwab', type: 'Brokerage', balance: 1200000, taxType: 'Taxable' }], riskScore: 62, status: 'attention' },
        { id: 'hh-002', name: 'Henderson Family', members: ['Robert'], totalValue: 1800000, accounts: [{ id: 'a2', name: 'IRA', custodian: 'Fidelity', type: 'IRA', balance: 800000, taxType: 'Tax-Deferred' }], riskScore: 35, status: 'rebalance' },
        { id: 'hh-003', name: 'Martinez Household', members: ['Maria'], totalValue: 950000, accounts: [{ id: 'a3', name: 'Roth IRA', custodian: 'Vanguard', type: 'Roth IRA', balance: 450000, taxType: 'Tax-Free' }], riskScore: 28, status: 'good' },
      ]),
    }),
  );

  await page.route('**/api/v1/ria/accounts**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'a1', householdId: 'hh-001', name: 'Wilson Joint Brokerage', custodian: 'Schwab', type: 'Brokerage', taxType: 'Taxable', balance: 1200000, fees: '0.85%', status: 'good' },
        { id: 'a2', householdId: 'hh-002', name: 'Henderson IRA', custodian: 'Fidelity', type: 'IRA', taxType: 'Tax-Deferred', balance: 800000, fees: '1.20%', status: 'high-fee' },
        { id: 'a3', householdId: 'hh-003', name: 'Martinez Roth', custodian: 'Vanguard', type: 'Roth IRA', taxType: 'Tax-Free', balance: 450000, fees: '0.15%', status: 'good' },
      ]),
    }),
  );

  await page.route('**/api/v1/compliance/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        compliance_score: 87,
        alerts: { open: 3, resolved: 12, by_severity: { critical: 0, high: 1, medium: 2, low: 0 } },
        pending_reviews: 2,
        tasks: { pending: 4, in_progress: 2, overdue: 1, completed: 8 },
      }),
    }),
  );

  // Seed the token, then navigate to root so React can pick it up
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(() => {
    localStorage.setItem('edgeai_token', 'e2e-test-token');
  });
}

/**
 * Seed client portal auth. PortalGuard only checks for token existence.
 */
export async function loginAsClient(page: Page) {
  // Catch-all first (lowest priority)
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: [], items: [] }),
    }),
  );

  // Specific portal mocks (higher priority)
  await page.route('**/api/v1/portal/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        portfolio_value: 2450000,
        total_gain: 185000,
        total_gain_pct: 8.2,
        ytd_return: 4.1,
        accounts: [
          { id: 'a1', name: 'Joint Brokerage', type: 'Brokerage', balance: 1200000, positions: [] },
          { id: 'a2', name: 'Roth IRA', type: 'Roth IRA', balance: 450000, positions: [] },
        ],
        recent_activity: [],
        advisor: { name: 'Sarah Chen', email: 'sarah@edgeai.test' },
      }),
    }),
  );

  await page.route('**/api/v1/portal/config/branding**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ firm_name: 'IAB Advisors', primary_color: '#2563eb', logo_url: null }),
    }),
  );

  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(() => {
    localStorage.setItem('portal_token', 'e2e-portal-test-token');
    localStorage.setItem(
      'portal_user',
      JSON.stringify({
        id: 'test-client-001',
        name: 'John Wilson',
        email: 'john@wilson.test',
        household_id: 'hh-001',
      }),
    );
  });
}

/** Clear all auth tokens. */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
