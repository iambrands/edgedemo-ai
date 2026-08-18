function getApiBase(): string {
  let url = import.meta.env.VITE_API_URL || '';

  if (url.includes('VITE_API_URL=')) {
    url = url.replace(/.*VITE_API_URL=/i, '');
  }

  if (url.includes('railway.app') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

const API_BASE = getApiBase();
const B2C_API_URL = `${API_BASE}/api/v1/b2c`;

export const B2C_TOKEN_KEY = 'firmum_b2c_token';
export const B2C_REFRESH_TOKEN_KEY = 'firmum_b2c_refresh_token';

interface B2CApiOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
}

export interface B2CTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  subscription_tier: string;
}

export interface B2CRegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface B2CRiskQuestion {
  id: string;
  question: string;
  options: Array<{
    label: string;
    score: number;
  }>;
}

export interface B2CRiskProfileResponse {
  risk_tolerance: string;
  risk_score: number;
  target_allocation: Record<string, string>;
  investment_objective: string;
  time_horizon: string;
  sophistication_level: string;
  risk_profile_completed: boolean;
}

export interface B2CDashboardResponse {
  total_aum: string;
  accounts: Array<{
    id: string;
    custodian: string;
    account_type: string;
    total_value: string;
    last_statement_date?: string | null;
  }>;
  allocation: Array<{
    asset_class: string;
    pct: string;
    value: string;
  }>;
  fee_impact_summary?: {
    annual_cost: string;
    ten_year_impact: string;
    thirty_year_impact: string;
    potential_savings: string;
    highest_fee_account?: string | null;
    highest_fee_rate?: string | null;
    effective_fee_rate_pct?: string | null;
  } | null;
  fee_benchmarks?: Array<{
    label: string;
    rate_pct: string;
    annual_cost_at_aum: string;
  }>;
  net_worth_history?: Array<{ date: string; value: string }>;
  risk_profile?: {
    risk_number: number;
    risk_tolerance: string;
    label: string;
  } | null;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    action: string;
    gated: boolean;
    upgrade_tier?: string | null;
  }>;
  ai_chat_remaining: number;
  subscription_tier: string;
}

export interface B2CStatementConfirmResponse {
  status: string;
  statementId: string;
  positionsCreated: number;
  persistedStatementId?: string | null;
  persistedAccountId?: string | null;
}

export interface B2CMeResponse {
  id: string;
  email: string;
  user_type: string;
  subscription_tier: string | null;
  onboarding_completed: boolean;
  risk_profile_completed: boolean;
  management_mode: string;
  advisor_connection_status: string;
}

export interface B2CStatement {
  id: string;
  account_id: string | null;
  custodian: string | null;
  statement_date: string | null;
  ending_value: number | null;
  status: string;
  filename: string;
}

export interface B2CTransaction {
  id: string;
  date: string;       // "YYYY-MM-DD"
  merchant: string;
  amount: number;     // positive = expense, negative = income
  category: string;
  account: string;
  pending: boolean;
}

export interface B2CTaxSummary {
  tax_year: number;
  short_term_gains: number;
  long_term_gains: number;
  tlh_opportunities: number;
  tlh_estimated_savings: number;
  projected_tax_liability: number;
  mock?: boolean;
}

export interface B2CGoal {
  id: string;
  goal_type: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution?: number | null;
  progress_pct: number;
  on_track: boolean;
  notes?: string | null;
}

export interface B2CGoalCreateRequest {
  goal_type: string;
  name: string;
  target_amount: number;
  target_date: string;
  monthly_contribution?: number;
  notes?: string;
}

export interface AdvisorConnectRequest {
  investable_assets_range?: string;
  primary_goal?: string;
  preferred_meeting_format?: string;
  notes?: string;
}

export interface AdvisorConnectResponse {
  request_id: string;
  status: string;
  message: string;
}

export interface AdvisorConnectionStatus {
  status: string;
  request_id: string | null;
  matched_advisor_id: string | null;
  matched_at: string | null;
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  mock: boolean;
}

export interface PlaidExchangeRequest {
  public_token: string;
  institution_id?: string;
  institution_name?: string;
}

export interface PlaidLinkedAccount {
  account_id: string;
  name: string;
  type: string;
  balance: number;
}

export interface PlaidExchangeResponse {
  item_id: string;
  plaid_item_id: string;
  institution_name: string;
  accounts: PlaidLinkedAccount[];
  mock: boolean;
}

export interface PlaidItem {
  item_id: string;
  institution_name: string;
  institution_id: string | null;
  status: string;
  last_synced_at: string | null;
}

export interface StripeConfigStatus {
  stripe_configured: boolean;
  prices: Record<string, boolean>;
}

export interface B2CRetirementPlanRequest {
  current_assets: number;
  annual_contribution: number;
  years_to_retire: number;
  years_in_retirement: number;
  annual_spending: number;
  expected_return?: number;
  volatility?: number;
  inflation?: number;
}

export interface B2CRetirementPlanResponse {
  success_rate: number;
  simulations: number;
  median_ending_balance: number;
  p10_ending: number;
  p90_ending: number;
  percentile_paths: Record<'p10' | 'p25' | 'p50' | 'p75' | 'p90', number[]>;
  total_years: number;
  disclaimer: string;
}

export function storeB2CTokens(response: B2CTokenResponse) {
  localStorage.setItem(B2C_TOKEN_KEY, response.access_token);
  localStorage.setItem(B2C_REFRESH_TOKEN_KEY, response.refresh_token);
}

export function getB2CToken(): string | null {
  return localStorage.getItem(B2C_TOKEN_KEY);
}

export function getB2CRefreshToken(): string | null {
  return localStorage.getItem(B2C_REFRESH_TOKEN_KEY);
}

export function clearB2CTokens() {
  localStorage.removeItem(B2C_TOKEN_KEY);
  localStorage.removeItem(B2C_REFRESH_TOKEN_KEY);
}

let _refreshPromise: Promise<void> | null = null;

async function _tryRefresh(): Promise<void> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const rt = getB2CRefreshToken();
    if (!rt) throw new Error('No refresh token');
    const res = await fetch(`${B2C_API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) {
      clearB2CTokens();
      throw new Error('Session expired — please log in again');
    }
    const data = await res.json();
    storeB2CTokens(data);
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function b2cFetch<T>(path: string, options: B2CApiOptions = {}, _retry = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = options.token ?? getB2CToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${B2C_API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !_retry && getB2CRefreshToken()) {
    try {
      await _tryRefresh();
      return b2cFetch<T>(path, { ...options, token: getB2CToken() ?? undefined }, true);
    } catch {
      throw new Error('Session expired — please log in again');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const b2cApi = {
  register: (body: B2CRegisterRequest) =>
    b2cFetch<B2CTokenResponse>('/register', { method: 'POST', body }),

  login: (email: string, password: string) =>
    b2cFetch<B2CTokenResponse>('/login', { method: 'POST', body: { email, password } }),

  refresh: (refreshToken: string) =>
    b2cFetch<B2CTokenResponse>('/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),

  getMe: () => b2cFetch<B2CMeResponse>('/me'),

  getRiskQuestions: () =>
    b2cFetch<{ questions: B2CRiskQuestion[] }>('/onboarding/risk-profile/questions'),

  submitRiskProfile: (answers: Record<string, number>) =>
    b2cFetch<B2CRiskProfileResponse>('/onboarding/risk-profile', {
      method: 'POST',
      body: { answers },
    }),

  getDashboard: () => b2cFetch<B2CDashboardResponse>('/dashboard'),

  runRetirementPlan: (body: B2CRetirementPlanRequest) =>
    b2cFetch<B2CRetirementPlanResponse>('/planning/retirement', { method: 'POST', body }),

  // Plaid account aggregation
  createPlaidLinkToken: () =>
    b2cFetch<PlaidLinkTokenResponse>('/plaid/link-token', { method: 'POST', body: {} }),

  exchangePlaidToken: (body: PlaidExchangeRequest) =>
    b2cFetch<PlaidExchangeResponse>('/plaid/exchange', { method: 'POST', body }),

  getPlaidAccounts: () =>
    b2cFetch<{ items: PlaidItem[] }>('/plaid/accounts'),

  removePlaidItem: (itemId: string) =>
    fetch(`${API_BASE}/api/v1/b2c/plaid/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getB2CToken()}` },
    }),

  // Stripe config status (no auth)
  getStripeConfig: () =>
    fetch(`${API_BASE}/api/v1/b2c/subscription/config`)
      .then((r) => r.json()) as Promise<StripeConfigStatus>,

  getTierCatalog: () =>
    b2cFetch<{
      tiers: Array<{
        id: string;
        name: string;
        price_monthly_cents: number;
        price_annual_cents: number;
        features: Record<string, string | boolean>;
      }>;
    }>('/planning/tiers'),

  getStatements: () =>
    b2cFetch<{ statements: B2CStatement[] }>('/statements'),

  confirmStatement: (statementId: string) =>
    b2cFetch<B2CStatementConfirmResponse>(`/statements/${encodeURIComponent(statementId)}/confirm`, {
      method: 'POST',
    }),

  connectAdvisor: (body: AdvisorConnectRequest) =>
    b2cFetch<AdvisorConnectResponse>('/advisor/connect', { method: 'POST', body }),

  getAdvisorStatus: () =>
    b2cFetch<AdvisorConnectionStatus>('/advisor/connect/status'),

  cancelAdvisorConnection: () =>
    fetch(`${B2C_API_URL}/advisor/connect`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getB2CToken()}`,
      },
    }),

  startCheckout: (tier: 'starter' | 'pro' | 'premium', billingInterval: 'monthly' | 'annual' = 'monthly') =>
    b2cFetch<{ checkout_url: string; session_id: string }>('/subscription/upgrade', {
      method: 'POST',
      body: { tier, billing_interval: billingInterval },
    }),

  getSubscription: () =>
    b2cFetch<{
      tier: string;
      active: boolean;
      trial_end?: number | null;
      current_period_end?: number | null;
      cancel_at_period_end?: boolean;
    }>('/subscription'),

  getTaxSummary: () =>
    b2cFetch<B2CTaxSummary>('/tax-summary'),

  // Goals
  getGoals: () =>
    b2cFetch<{ goals: B2CGoal[]; mock?: boolean }>('/goals'),

  createGoal: (body: B2CGoalCreateRequest) =>
    b2cFetch<B2CGoal>('/goals', { method: 'POST', body }),

  deleteGoal: (goalId: string) =>
    fetch(`${B2C_API_URL}/goals/${encodeURIComponent(goalId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getB2CToken()}` },
    }),

  forgotPassword: (email: string) =>
    b2cFetch<{ status: string; message: string }>('/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  getTransactions: (days = 30) =>
    b2cFetch<{ transactions: B2CTransaction[]; mock?: boolean }>(
      `/plaid/transactions?days=${days}`,
    ),
};
