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

export function storeB2CTokens(response: B2CTokenResponse) {
  localStorage.setItem(B2C_TOKEN_KEY, response.access_token);
  localStorage.setItem(B2C_REFRESH_TOKEN_KEY, response.refresh_token);
}

export function getB2CToken(): string | null {
  return localStorage.getItem(B2C_TOKEN_KEY);
}

async function b2cFetch<T>(path: string, options: B2CApiOptions = {}): Promise<T> {
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
};
