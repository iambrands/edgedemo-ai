import { Page, Route } from '@playwright/test';

const FAKE_RIA_USER = {
  id: 'test-ria-001',
  email: 'advisor@edgeai.test',
  firstName: 'Test',
  lastName: 'Advisor',
  role: 'ria',
  firm: 'Firmum Demo',
  crd: '123456',
  state: 'CA',
  licenses: ['Series 65'],
};

/**
 * Mock all APIs and seed RIA auth token.
 * Uses context.route so mocks survive full page reloads (page.route does not).
 */
export async function loginAsRIA(page: Page) {
  const fulfillJson = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(body),
    });

  await page.context().route(/\/api\//, (route) => {
    const url = route.request().url();

    if (url.includes('/auth/me')) {
      return fulfillJson(route, FAKE_RIA_USER);
    }
    if (url.includes('/auth/login')) {
      return fulfillJson(route, {
        access_token: 'e2e-test-token',
        token_type: 'bearer',
        user: FAKE_RIA_USER,
      });
    }
    if (url.includes('/ria/dashboard/summary')) {
      return fulfillJson(route, {
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
      });
    }
    if (url.includes('/ria/households')) {
      return fulfillJson(route, [
        { id: 'hh-001', name: 'Wilson Household', members: ['John', 'Jane'], totalValue: 2450000, accounts: [{ id: 'a1', name: 'Joint Brokerage', custodian: 'Schwab', type: 'Brokerage', balance: 1200000, taxType: 'Taxable' }], riskScore: 62, status: 'attention' },
        { id: 'hh-002', name: 'Henderson Family', members: ['Robert'], totalValue: 1800000, accounts: [{ id: 'a2', name: 'IRA', custodian: 'Fidelity', type: 'IRA', balance: 800000, taxType: 'Tax-Deferred' }], riskScore: 35, status: 'rebalance' },
        { id: 'hh-003', name: 'Martinez Household', members: ['Maria'], totalValue: 950000, accounts: [{ id: 'a3', name: 'Roth IRA', custodian: 'Vanguard', type: 'Roth IRA', balance: 450000, taxType: 'Tax-Free' }], riskScore: 28, status: 'good' },
      ]);
    }
    if (url.includes('/ria/accounts')) {
      return fulfillJson(route, [
        { id: 'a1', householdId: 'hh-001', name: 'Wilson Joint Brokerage', custodian: 'Schwab', type: 'Brokerage', taxType: 'Taxable', balance: 1200000, fees: '0.85%', status: 'good' },
        { id: 'a2', householdId: 'hh-002', name: 'Henderson IRA', custodian: 'Fidelity', type: 'IRA', taxType: 'Tax-Deferred', balance: 800000, fees: '1.20%', status: 'high-fee' },
        { id: 'a3', householdId: 'hh-003', name: 'Martinez Roth', custodian: 'Vanguard', type: 'Roth IRA', taxType: 'Tax-Free', balance: 450000, fees: '0.15%', status: 'good' },
      ]);
    }
    if (url.includes('/compliance/dashboard')) {
      return fulfillJson(route, {
        compliance_score: 87,
        alerts: { open: 3, resolved: 12, by_severity: { critical: 0, high: 1, medium: 2, low: 0 } },
        pending_reviews: 2,
        tasks: { pending: 4, in_progress: 2, overdue: 1, completed: 8 },
      });
    }
    if (url.includes('/compliance/alerts')) {
      return fulfillJson(route, []);
    }
    if (url.includes('/compliance/tasks')) {
      return fulfillJson(route, []);
    }
    if (url.includes('/compliance/audit-trail')) {
      return fulfillJson(route, []);
    }
    if (url.includes('/compliance/exceptions')) {
      return fulfillJson(route, []);
    }

    if (url.includes('/ria/connections')) {
      return fulfillJson(route, []);
    }

    return fulfillJson(route, { status: 'ok', data: [], items: [], results: [] });
  });

  // Seed token before React boots so AuthContext loads the user via /auth/me mock.
  await page.addInitScript(() => {
    sessionStorage.setItem('edgeai_token', 'e2e-test-token');
    localStorage.setItem('edgeai_token', 'e2e-test-token');
  });

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.waitForSelector('main', { timeout: 15_000 });
}

/**
 * Seed client portal auth. PortalGuard only checks for token existence.
 */
export async function loginAsClient(page: Page) {
  const fulfillJson = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(body),
    });

  // context.route survives full page reloads; page.route does not.
  await page.context().route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: [], items: [] }),
    }),
  );

  // ── 2) Specific portal mocks  (registered after → higher priority) ─

  await page.context().route('**/api/v1/portal/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        client_name: 'John Wilson',
        advisor_name: 'Sarah Chen',
        firm_name: 'IAB Advisors',
        total_value: 54905.58,
        ytd_return: 8.5,
        ytd_return_dollar: 4305,
        accounts: [
          { id: 'a1', account_name: 'IRA (4532)', account_type: 'IRA', current_value: 32405, tax_type: 'Tax-Deferred' },
          { id: 'a2', account_name: 'Individual (8821)', account_type: 'Brokerage', current_value: 22500, tax_type: 'Taxable' },
        ],
        pending_nudges: 2,
        unread_narratives: 1,
        active_goals: 3,
        last_updated: '2026-02-04T10:00:00Z',
        recent_activity: [],
        advisor: { name: 'Sarah Chen', email: 'sarah@edgeai.test' },
      }),
    }),
  );

  await page.context().route('**/api/v1/portal/config/branding**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ firm_name: 'IAB Advisors', primary_color: '#2563eb', logo_url: null }),
    }),
  );

  // ── Performance ─────────────────────────────────────────────────
  await page.context().route('**/api/v1/portal/performance**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          total_value: 54905.58,
          total_cost_basis: 48500.00,
          total_gain_loss: 6405.58,
          total_gain_loss_pct: 13.21,
          ytd_return: 8.5,
          mtd_return: 2.1,
          inception_return: 13.21,
          inception_date: '2022-03-15',
        },
        time_series: {
          '1M': [
            { date: '2026-01-07', value: 53200, benchmark: 53000 },
            { date: '2026-01-21', value: 53800, benchmark: 53500 },
            { date: '2026-02-04', value: 54905, benchmark: 54100 },
          ],
          '3M': [
            { date: '2025-11-04', value: 51000, benchmark: 50800 },
            { date: '2025-12-04', value: 52300, benchmark: 52100 },
            { date: '2026-02-04', value: 54905, benchmark: 54100 },
          ],
          YTD: [
            { date: '2026-01-01', value: 50600, benchmark: 50400 },
            { date: '2026-01-15', value: 52100, benchmark: 51800 },
            { date: '2026-02-04', value: 54905, benchmark: 54100 },
          ],
          '1Y': [
            { date: '2025-02-04', value: 44000, benchmark: 43800 },
            { date: '2025-08-04', value: 48500, benchmark: 48100 },
            { date: '2026-02-04', value: 54905, benchmark: 54100 },
          ],
          ALL: [
            { date: '2022-03-15', value: 35000, benchmark: 35000 },
            { date: '2024-01-01', value: 44000, benchmark: 43200 },
            { date: '2026-02-04', value: 54905, benchmark: 54100 },
          ],
        },
        asset_allocation: {
          current: [
            { category: 'US Equity', pct: 60 },
            { category: 'Fixed Income', pct: 25 },
            { category: 'International', pct: 10 },
            { category: 'Alternatives', pct: 5 },
          ],
          target: [
            { category: 'US Equity', pct: 55 },
            { category: 'Fixed Income', pct: 30 },
            { category: 'International', pct: 10 },
            { category: 'Alternatives', pct: 5 },
          ],
        },
        monthly_returns: [
          { month: 'Jan 2026', return: 3.1, benchmark: 2.7 },
          { month: 'Dec 2025', return: 2.2, benchmark: 1.9 },
          { month: 'Nov 2025', return: -0.8, benchmark: -0.3 },
          { month: 'Oct 2025', return: 1.5, benchmark: 1.2 },
        ],
        benchmark_name: '60/40 Balanced Index',
      }),
    });
  });

  // ── Meetings ────────────────────────────────────────────────────
  // NOTE: Register broad pattern FIRST (lower priority), then specific
  // sub-routes AFTER (higher priority) since Playwright checks last→first.
  await page.context().route('**/api/v1/portal/meetings**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          meeting: {
            id: 'mtg-new',
            title: 'Portfolio Review',
            datetime: '2026-02-10T09:00:00Z',
            duration_minutes: 30,
            meeting_type: 'review',
            status: 'scheduled',
            advisor_name: 'Sarah Chen',
            notes: '',
            meeting_link: 'https://zoom.us/j/123',
          },
        }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          upcoming: [
            {
              id: 'mtg-1',
              title: 'Portfolio Review',
              datetime: '2026-02-15T10:00:00Z',
              duration_minutes: 30,
              meeting_type: 'review',
              status: 'scheduled',
              advisor_name: 'Sarah Chen',
              notes: '',
              meeting_link: 'https://zoom.us/j/456',
            },
          ],
          advisor_name: 'Sarah Chen',
          advisor_phone: '(555) 123-4567',
        }),
      });
    }
  });

  await page.context().route('**/api/v1/portal/meetings/availability**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slots: [
          { id: 'slot-1', date: '2026-02-10', time: '9:00 AM', datetime: '2026-02-10T09:00:00Z', duration_minutes: 30 },
          { id: 'slot-2', date: '2026-02-10', time: '10:00 AM', datetime: '2026-02-10T10:00:00Z', duration_minutes: 30 },
          { id: 'slot-3', date: '2026-02-11', time: '2:00 PM', datetime: '2026-02-11T14:00:00Z', duration_minutes: 60 },
        ],
        meeting_types: [
          { id: 'review', name: 'Portfolio Review', duration: 30, description: 'Review your portfolio performance' },
          { id: 'planning', name: 'Financial Planning', duration: 60, description: 'Comprehensive planning session' },
        ],
      }),
    });
  });

  // ── Requests ────────────────────────────────────────────────────
  // Broad pattern first (lower priority), specific sub-route after
  await page.context().route('**/api/v1/portal/requests**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, request: { id: 'req-new', status: 'pending' } }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requests: [
            {
              id: 'req-1',
              type: 'withdrawal',
              type_name: 'Withdrawal Request',
              status: 'pending',
              submitted_at: '2026-02-01T10:00:00Z',
              details: { account: 'IRA (4532)', amount: 5000, method: 'ACH Transfer' },
              notes: 'Monthly distribution',
              updates: [{ status: 'pending', timestamp: '2026-02-01T10:00:00Z', note: 'Request received' }],
            },
          ],
        }),
      });
    }
  });

  await page.context().route('**/api/v1/portal/requests/types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        types: [
          { id: 'withdrawal', name: 'Withdrawal Request', icon: 'banknote', description: 'Request a withdrawal from your account' },
          { id: 'transfer', name: 'Transfer Request', icon: 'arrow-right-left', description: 'Transfer between accounts' },
          { id: 'address_change', name: 'Address Change', icon: 'map-pin', description: 'Update your address on file' },
          { id: 'document_request', name: 'Document Request', icon: 'file-text', description: 'Request a specific document' },
        ],
      }),
    });
  });

  // ── Notifications ───────────────────────────────────────────────
  // Broad pattern first (lower priority), specific sub-routes after
  await page.context().route('**/api/v1/portal/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: [
          { id: 'n1', type: 'document', title: 'New Document Available', message: 'Your Q4 2025 performance report is ready to view.', link: '/portal/documents', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'n2', type: 'alert', title: 'Action Required', message: 'Please review and approve your updated financial plan.', link: '/portal/goals', is_read: false, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'n3', type: 'meeting', title: 'Upcoming Meeting', message: 'Reminder: Portfolio review with Sarah Chen tomorrow at 10 AM.', link: '/portal/meetings', is_read: true, created_at: new Date(Date.now() - 172800000).toISOString() },
        ],
        unread_count: 2,
      }),
    });
  });

  await page.context().route('**/api/v1/portal/notifications/read-all**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.context().route('**/api/v1/portal/notifications/**/read**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // ── AI Assistant ────────────────────────────────────────────────
  await page.context().route('**/api/v1/portal/assistant/history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm your AI financial assistant. Ask me anything about your accounts, performance, goals, or taxes.",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await page.context().route('**/api/v1/portal/assistant/chat**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: 'Your total portfolio is worth **$54,905**. Your YTD return is **+8.5%**, outperforming the benchmark by 1.2%.',
        suggested_follow_ups: ['Show my accounts', 'View performance chart', 'What about taxes?'],
      }),
    });
  });

  // ── What-If Scenarios ──────────────────────────────────────────
  await page.context().route('**/api/v1/portal/what-if/calculate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projection: {
          retirement_balance: 892450,
          monthly_income: 4500,
          years_of_income: 25,
          success_probability: 85,
        },
        yearly_projections: [
          { age: 45, balance: 54905, contributions: 12000 },
          { age: 50, balance: 180000, contributions: 12000 },
          { age: 55, balance: 380000, contributions: 12000 },
          { age: 60, balance: 620000, contributions: 12000 },
          { age: 65, balance: 892450, contributions: 0 },
        ],
        comparison: [
          { label: 'Retire at 62', retirement_age: 62, balance: 720000, monthly_income: 3600, success_probability: 72 },
          { label: 'Retire at 65', retirement_age: 65, balance: 892450, monthly_income: 4500, success_probability: 85 },
          { label: 'Retire at 67', retirement_age: 67, balance: 1050000, monthly_income: 5200, success_probability: 92 },
        ],
      }),
    });
  });

  // ── Tax Center ─────────────────────────────────────────────────
  await page.context().route('**/api/v1/portal/tax/lots**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        lots: [
          { symbol: 'NVDA', shares: 10, cost_basis: 200, current_price: 600, unrealized: 4000, term: 'long', purchase_date: '2023-06-15' },
          { symbol: 'MSFT', shares: 5, cost_basis: 350, current_price: 420, unrealized: 350, term: 'long', purchase_date: '2024-01-10' },
        ],
      }),
    });
  });

  await page.context().route('**/api/v1/portal/tax/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          realized_gains_st: 1250,
          realized_gains_lt: 4500,
          realized_losses: -890,
          net_realized: 4860,
          estimated_tax: 987.50,
          unrealized_gains: 6405,
          unrealized_losses: -320,
        },
        harvesting_opportunities: [
          { symbol: 'INTC', unrealized_loss: -450, potential_tax_savings: 112, term: 'short' },
        ],
        realized_transactions: [
          { date: '2025-11-15', symbol: 'AAPL', shares: 5, proceeds: 950, cost_basis: 500, gain: 450, term: 'long' },
          { date: '2025-10-20', symbol: 'TSLA', shares: 2, proceeds: 480, cost_basis: 580, gain: -100, term: 'short' },
        ],
        tax_documents: [
          { id: 'td-1', name: '2025 Form 1099-B', year: 2025, status: 'available', type: '1099-B' },
          { id: 'td-2', name: '2025 Form 1099-DIV', year: 2025, status: 'available', type: '1099-DIV' },
        ],
      }),
    });
  });

  // ── Beneficiaries ──────────────────────────────────────────────
  // Broad pattern first (lower priority), specific sub-route after
  await page.context().route('**/api/v1/portal/beneficiaries**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accounts: [
          {
            account_id: 'acc-001',
            account_name: 'IRA (4532)',
            account_type: 'IRA',
            needs_review: true,
            last_reviewed: '2023-06-15',
            primary_beneficiaries: [{ name: 'Nicole Wilson', relationship: 'Spouse', percentage: 100 }],
            contingent_beneficiaries: [{ name: 'Emma Wilson', relationship: 'Daughter', percentage: 50 }, { name: 'James Wilson', relationship: 'Son', percentage: 50 }],
          },
          {
            account_id: 'acc-002',
            account_name: 'Brokerage (8821)',
            account_type: 'Brokerage',
            needs_review: false,
            last_reviewed: '2025-11-01',
            primary_beneficiaries: [{ name: 'Nicole Wilson', relationship: 'Spouse', percentage: 100 }],
            contingent_beneficiaries: [],
          },
        ],
        pending_requests: [],
      }),
    });
  });

  await page.context().route('**/api/v1/portal/beneficiaries/update-request**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Update request submitted' }),
    });
  });

  // ── Family Dashboard ───────────────────────────────────────────
  // Broad pattern first (lower priority), specific sub-route after
  await page.context().route('**/api/v1/portal/family**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        household_name: 'Wilson Family',
        total_household_value: 142405,
        household_allocation: [
          { category: 'US Equity', pct: 58 },
          { category: 'Fixed Income', pct: 27 },
          { category: 'International', pct: 10 },
          { category: 'Alternatives', pct: 5 },
        ],
        members: [
          { id: 'm1', name: 'John Wilson', relationship: 'Self', total_value: 54905, is_self: true, can_view_details: true },
          { id: 'm2', name: 'Nicole Wilson', relationship: 'Spouse', total_value: 87500, is_self: false, can_view_details: true },
        ],
        dependents: [
          { id: 'd1', name: 'Emma Wilson', relationship: 'Daughter', age: 16, has_529: true, plan_value: 45000 },
        ],
        joint_accounts: [
          { id: 'ja-1', name: 'Joint Brokerage', type: 'Brokerage', value: 65000, owners: ['John Wilson', 'Nicole Wilson'] },
        ],
      }),
    });
  });

  await page.context().route('**/api/v1/portal/family/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'm1',
        name: 'John Wilson',
        relationship: 'Self',
        total_value: 54905,
        accounts: [
          { name: 'IRA (4532)', type: 'IRA', value: 32405 },
          { name: 'Brokerage (8821)', type: 'Brokerage', value: 22500 },
        ],
      }),
    });
  });

  // Seed portal token before React boots (PortalGuard checks localStorage only).
  await page.addInitScript(() => {
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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

const B2C_TOKEN_RESPONSE = {
  access_token: 'e2e-b2c-test-token',
  refresh_token: 'e2e-b2c-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  user_id: 'test-b2c-001',
  subscription_tier: 'free',
};

const B2C_DEMO_GOALS = [
  {
    id: 'goal-demo-001',
    goal_type: 'retirement',
    name: 'Retire by 2040',
    target_amount: 1200000,
    current_amount: 125000,
    target_date: '2040-12-31',
    monthly_contribution: 1500,
    progress_pct: 10.4,
    on_track: true,
    notes: null,
  },
  {
    id: 'goal-demo-002',
    goal_type: 'emergency_fund',
    name: 'Emergency Fund',
    target_amount: 24000,
    current_amount: 18000,
    target_date: '2027-06-30',
    monthly_contribution: 500,
    progress_pct: 75.0,
    on_track: true,
    notes: null,
  },
  {
    id: 'goal-demo-003',
    goal_type: 'vacation',
    name: 'Europe Trip',
    target_amount: 8000,
    current_amount: 2400,
    target_date: '2027-03-31',
    monthly_contribution: 200,
    progress_pct: 30.0,
    on_track: false,
    notes: 'Summer 2027',
  },
];

/**
 * Mock all /api/v1/b2c/* endpoints for E2E tests.
 * Call before navigating to B2C pages (login flow, onboarding, etc.).
 */
export async function setupB2CApiMocks(page: Page) {
  const fulfillJson = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(body),
    });

  await page.context().route('**/api/v1/b2c/**', (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/b2c/login') && method === 'POST') {
      return fulfillJson(route, B2C_TOKEN_RESPONSE);
    }
    if (url.includes('/b2c/register') && method === 'POST') {
      return fulfillJson(route, B2C_TOKEN_RESPONSE);
    }
    if (url.includes('/b2c/me')) {
      return fulfillJson(route, {
        id: 'test-b2c-001',
        email: 'demo@b2c.test',
        user_type: 'b2c_diy',
        subscription_tier: 'free',
        onboarding_completed: true,
        risk_profile_completed: true,
        management_mode: 'diy',
        advisor_connection_status: 'none',
      });
    }
    if (url.includes('/b2c/dashboard')) {
      return fulfillJson(route, {
        total_aum: '125000',
        total_assets: '165000',
        total_liabilities: '40000',
        accounts: [
          {
            id: 'acc-1',
            custodian: 'Chase',
            account_type: 'Checking',
            account_category: 'depository',
            is_liability: false,
            total_value: '12450',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-1b',
            custodian: 'Ally Bank',
            account_type: 'Savings',
            account_category: 'depository',
            is_liability: false,
            total_value: '22550',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-2',
            custodian: 'Fidelity',
            account_type: 'Brokerage',
            account_category: 'investment',
            is_liability: false,
            total_value: '78320',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-3',
            custodian: 'Vanguard',
            account_type: '401(k)',
            account_category: 'investment',
            is_liability: false,
            total_value: '51680',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-4',
            custodian: 'Chase',
            account_type: 'Sapphire Reserve',
            account_category: 'credit',
            is_liability: true,
            total_value: '3400',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-5',
            custodian: 'American Express',
            account_type: 'Gold Card',
            account_category: 'credit',
            is_liability: true,
            total_value: '1600',
            last_statement_date: '2026-01-31',
          },
          {
            id: 'acc-6',
            custodian: 'Wells Fargo',
            account_type: 'Mortgage',
            account_category: 'loan',
            is_liability: true,
            total_value: '35000',
            last_statement_date: '2026-01-31',
          },
        ],
        allocation: [
          { asset_class: 'US Equity', pct: '65', value: '81250' },
          { asset_class: 'Fixed Income', pct: '25', value: '31250' },
          { asset_class: 'International', pct: '10', value: '12500' },
        ],
        fee_impact_summary: {
          annual_cost: '625',
          ten_year_impact: '7800',
          thirty_year_impact: '32000',
          potential_savings: '1200',
          effective_fee_rate_pct: '0.50',
        },
        fee_benchmarks: [
          { label: 'Your portfolio (estimated)', rate_pct: '0.50', annual_cost_at_aum: '625' },
          { label: 'Robo-advisor average', rate_pct: '0.25', annual_cost_at_aum: '312' },
          { label: 'Traditional advisor average', rate_pct: '1.00', annual_cost_at_aum: '1250' },
        ],
        net_worth_history: [
          { date: '2025-03-31', value: '105200' },
          { date: '2025-06-30', value: '109800' },
          { date: '2025-09-30', value: '114500' },
          { date: '2025-12-31', value: '123500' },
          { date: '2026-01-31', value: '125000' },
        ],
        risk_profile: {
          risk_number: 62,
          risk_tolerance: 'moderate',
          label: 'Moderate Growth',
        },
        alerts: [],
        ai_chat_remaining: 8,
        subscription_tier: 'free',
        mock: true,
      });
    }
    if (url.includes('/b2c/goals')) {
      if (method === 'POST') {
        return fulfillJson(route, {
          ...B2C_DEMO_GOALS[0],
          id: 'goal-new-e2e',
          name: 'New E2E Goal',
          mock: true,
        });
      }
      return fulfillJson(route, { goals: B2C_DEMO_GOALS, mock: true });
    }
    if (url.includes('/b2c/onboarding/risk-profile/questions')) {
      return fulfillJson(route, {
        questions: [
          {
            id: 'q1',
            question: 'How would you react if your portfolio dropped 20% in a year?',
            options: [
              { label: 'Sell everything', score: 1 },
              { label: 'Hold steady', score: 3 },
              { label: 'Buy more', score: 5 },
            ],
          },
        ],
        mock: true,
      });
    }
    if (url.includes('/b2c/onboarding/risk-profile') && method === 'POST') {
      return fulfillJson(route, {
        risk_tolerance: 'moderate',
        risk_score: 62,
        target_allocation: { equity: '60', fixed_income: '30', cash: '10' },
        investment_objective: 'growth',
        time_horizon: 'long',
        sophistication_level: 'intermediate',
        risk_profile_completed: true,
        mock: true,
      });
    }
    if (url.includes('/b2c/plaid/transactions')) {
      return fulfillJson(route, {
        transactions: [
          {
            id: 'txn-e2e-001',
            date: '2026-08-15',
            merchant: 'Whole Foods Market',
            amount: 127.43,
            category: 'groceries',
            account: 'Chase Checking',
            pending: false,
          },
          {
            id: 'txn-e2e-002',
            date: '2026-08-14',
            merchant: 'Chipotle',
            amount: 18.75,
            category: 'dining',
            account: 'Chase Checking',
            pending: false,
          },
        ],
        mock: true,
      });
    }
    if (url.includes('/b2c/budgets')) {
      if (method === 'POST') {
        return fulfillJson(route, {
          category: 'groceries',
          label: 'Groceries',
          monthly_limit: 500,
          current_spend: 620.49,
          pct: 124.1,
          status: 'over',
          mock: true,
        });
      }
      return fulfillJson(route, {
        budgets: [
          {
            category: 'groceries',
            label: 'Groceries',
            monthly_limit: 500,
            current_spend: 620.49,
            pct: 124.1,
            status: 'over',
          },
          {
            category: 'dining',
            label: 'Dining',
            monthly_limit: 200,
            current_spend: 148.3,
            pct: 74.2,
            status: 'ok',
          },
        ],
        mock: true,
      });
    }
    if (url.includes('/b2c/bills')) {
      return fulfillJson(route, {
        bills: [
          {
            merchant: 'Netflix',
            category: 'entertainment',
            amount: 22.99,
            frequency: 'monthly',
            next_expected_date: '2026-09-12',
            monthly_equivalent: 22.99,
          },
        ],
        total_monthly: 22.99,
        mock: true,
      });
    }
    if (url.includes('/b2c/tax-summary')) {
      return fulfillJson(route, {
        tax_year: 2026,
        short_term_gains: 2840,
        long_term_gains: 8120,
        tlh_opportunities: 2,
        tlh_estimated_savings: 680,
        projected_tax_liability: 3240,
        mock: true,
      });
    }
    if (url.includes('/b2c/planning/retirement')) {
      const years = 45;
      const path = Array.from({ length: years + 1 }, (_, i) => 100000 + i * 8000);
      return fulfillJson(route, {
        success_rate: 78.5,
        simulations: 1000,
        median_ending_balance: 850000,
        p10_ending: 420000,
        p90_ending: 1400000,
        percentile_paths: { p10: path, p25: path, p50: path, p75: path, p90: path },
        total_years: years,
        disclaimer: 'Educational projection only — not personalized investment advice.',
      });
    }
    if (url.includes('/b2c/statements')) {
      return fulfillJson(route, { statements: [] });
    }
    if (url.includes('/b2c/advisor/connect')) {
      return fulfillJson(route, {
        status: 'none',
        request_id: null,
        matched_advisor_id: null,
        matched_at: null,
      });
    }
    if (url.includes('/b2c/subscription/config')) {
      return fulfillJson(route, { stripe_configured: false, prices: {} });
    }
    if (url.includes('/b2c/subscription/upgrade')) {
      return fulfillJson(route, { checkout_url: '/client/upgrade?mock=true', session_id: 'cs_mock' });
    }
    if (url.includes('/b2c/subscription')) {
      return fulfillJson(route, { tier: 'free', active: false, trial_end: null, cancel_at_period_end: false });
    }
    if (url.includes('/b2c/plaid/link-token')) {
      return fulfillJson(route, { link_token: 'link-sandbox-mock-e2e', expiration: '2099-01-01T00:00:00Z', mock: true });
    }
    if (url.includes('/b2c/plaid/exchange')) {
      return fulfillJson(route, {
        item_id: 'mock-item-e2e',
        plaid_item_id: 'mock-plaid-e2e',
        institution_name: 'Demo Bank',
        accounts: [{ account_id: 'acc-e2e', name: 'Demo Brokerage', type: 'investment', balance: 125000 }],
        mock: true,
      });
    }
    if (url.includes('/b2c/plaid/accounts')) {
      return fulfillJson(route, { items: [], mock: true });
    }
    if (url.includes('/b2c/forgot-password') && method === 'POST') {
      return fulfillJson(route, {
        status: 'sent',
        message: 'If this email is registered, you will receive a reset link shortly.',
        mock: true,
      });
    }
    if (url.includes('/b2c/insights')) {
      return fulfillJson(route, {
        insights: [
          {
            id: 'fee-savings',
            type: 'fee_savings',
            title: 'You could save ~$938/yr in investment fees',
            body: 'Your estimated fee rate is above the robo-advisor average.',
            cta_label: 'View fee analyzer',
            cta_path: '/client/dashboard',
            priority: 1,
          },
        ],
        count: 1,
        mock: true,
      });
    }
    if (url.includes('/b2c/push/status')) {
      return fulfillJson(route, { subscribed: false, mock: true });
    }
    if (url.includes('/b2c/holdings')) {
      return fulfillJson(route, {
        holdings: [
          {
            symbol: 'AAPL',
            description: 'Apple Inc',
            quantity: 120,
            price: 195.5,
            market_value: 23460,
            security_type: 'Equity',
            asset_class: 'US Equity',
            gain_pct: 142.3,
          },
          {
            symbol: 'VTI',
            description: 'Vanguard Total Stock Market ETF',
            quantity: 85,
            price: 248.2,
            market_value: 21097,
            security_type: 'ETF',
            asset_class: 'US Equity',
            gain_pct: 68.4,
          },
          {
            symbol: 'BND',
            description: 'Vanguard Total Bond Market ETF',
            quantity: 200,
            price: 72.4,
            market_value: 14480,
            security_type: 'ETF',
            asset_class: 'Fixed Income',
            gain_pct: 4.2,
          },
        ],
        count: 3,
        mock: true,
      });
    }
    if (url.includes('/b2c/notifications')) {
      if (method === 'POST') {
        return fulfillJson(route, { status: 'read', mock: true });
      }
      return fulfillJson(route, {
        notifications: [
          {
            id: 'n1',
            type: 'budget',
            severity: 'warning',
            title: 'Groceries budget exceeded',
            body: 'You spent $620 against a $500 monthly limit.',
            action_label: 'Review budgets',
            action_route: '/client/budgets',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
          },
        ],
        unread_count: 1,
        mock: true,
      });
    }
    if (url.includes('/b2c/ai/analysis')) {
      return fulfillJson(route, {
        narrative: 'Your net worth grew steadily over the past year. Fee optimization and tax-loss harvesting remain your highest-impact levers.',
        insights: [],
        model: 'gpt-4o-mini',
        generated_at: new Date().toISOString(),
        cached: false,
      });
    }
    if (url.includes('/b2c/advisors')) {
      return fulfillJson(route, { advisors: [], mock: true });
    }
    return fulfillJson(route, { status: 'ok', data: [], statements: [], mock: true });
  });
}

/** Seed B2C token in localStorage (call after setupB2CApiMocks). */
export async function seedB2CTokens(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('firmum_b2c_token', 'e2e-b2c-test-token');
    localStorage.setItem('firmum_b2c_refresh_token', 'e2e-b2c-refresh-token');
    localStorage.setItem('firmum_b2c_email', 'demo@b2c.test');
  });
}

/**
 * Seed B2C DIY user auth token and mock all /api/v1/b2c/* endpoints.
 */
export async function loginAsB2CUser(page: Page) {
  await setupB2CApiMocks(page);
  await seedB2CTokens(page);
  await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

/** Clear all auth tokens. */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
