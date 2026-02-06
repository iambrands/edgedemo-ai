/**
 * Liquidity Optimization API service.
 * Handles tax-optimized withdrawal planning and execution.
 */

// Get API base URL with HTTPS safeguard for Railway
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

// ============================================================================
// TYPES
// ============================================================================

export interface LiquidityProfile {
  id: string;
  client_id: string;
  default_priority: string;
  default_lot_selection: string;
  federal_tax_bracket?: number;
  state_tax_rate?: number;
  capital_gains_rate_short: number;
  capital_gains_rate_long: number;
  min_cash_reserve: number;
  max_single_position_liquidation_pct: number;
  avoid_wash_sales: boolean;
  ytd_short_term_gains: number;
  ytd_long_term_gains: number;
  ytd_short_term_losses: number;
  ytd_long_term_losses: number;
  loss_carryforward: number;
  created_at: string;
  updated_at: string;
}

export interface TaxLot {
  id: string;
  account_id: string;
  broker_lot_id?: string;
  symbol: string;
  shares: number;
  cost_basis_per_share: number;
  total_cost_basis: number;
  current_price?: number;
  current_value?: number;
  unrealized_gain_loss?: number;
  acquisition_date?: string;
  acquisition_method: string;
  days_held?: number;
  is_short_term: boolean;
  is_active: boolean;
}

export interface LineItem {
  id: string;
  account_id?: string;
  symbol: string;
  shares_to_sell: number;
  estimated_proceeds: number;
  cost_basis?: number;
  estimated_gain_loss?: number;
  is_short_term?: boolean;
  sequence: number;
  executed_at?: string;
}

export interface WithdrawalPlan {
  id: string;
  request_id: string;
  plan_name: string;
  is_recommended: boolean;
  total_amount: number;
  estimated_tax_cost?: number;
  estimated_short_term_gains: number;
  estimated_long_term_gains: number;
  estimated_short_term_losses: number;
  estimated_long_term_losses: number;
  ai_generated: boolean;
  ai_reasoning?: string;
  line_items: LineItem[];
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  client_id: string;
  requested_amount: number;
  requested_date: string;
  purpose?: string;
  priority: string;
  lot_selection: string;
  status: string;
  optimized_plan_id?: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  plans: WithdrawalPlan[];
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequestCreate {
  client_id: string;
  amount: number;
  purpose?: string;
  priority?: string;
  lot_selection?: string;
  requested_date?: string;
}

export interface CashFlow {
  id: string;
  flow_type: string;
  description?: string;
  amount: number;
  expected_date: string;
  actual_date?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  is_projected: boolean;
  is_confirmed: boolean;
}

// ============================================================================
// API ERROR HANDLING
// ============================================================================

class LiquidityApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LiquidityApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
}

async function fetchLiquidityApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new LiquidityApiError(response.status, detail);
  }

  return response.json();
}

// ============================================================================
// PROFILE API
// ============================================================================

export async function getProfile(clientId: string): Promise<LiquidityProfile> {
  return fetchLiquidityApi<LiquidityProfile>(`/api/v1/liquidity/profile/${clientId}`);
}

export async function updateProfile(
  clientId: string,
  updates: Partial<LiquidityProfile>
): Promise<LiquidityProfile> {
  return fetchLiquidityApi<LiquidityProfile>(`/api/v1/liquidity/profile/${clientId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// TAX LOT API
// ============================================================================

export async function getTaxLots(accountId: string, symbol?: string): Promise<TaxLot[]> {
  const params = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  return fetchLiquidityApi<TaxLot[]>(`/api/v1/liquidity/tax-lots/${accountId}${params}`);
}

export async function syncTaxLots(
  accountId: string,
  lots: Array<Record<string, unknown>>
): Promise<{ synced: number; message: string; lots: TaxLot[] }> {
  return fetchLiquidityApi(`/api/v1/liquidity/tax-lots/${accountId}/sync`, {
    method: 'POST',
    body: JSON.stringify({ lots }),
  });
}

// ============================================================================
// WITHDRAWAL REQUEST API
// ============================================================================

export async function createWithdrawalRequest(
  data: WithdrawalRequestCreate
): Promise<WithdrawalRequest> {
  return fetchLiquidityApi<WithdrawalRequest>('/api/v1/liquidity/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listWithdrawalRequests(
  clientId?: string,
  status?: string
): Promise<WithdrawalRequest[]> {
  const params = new URLSearchParams();
  if (clientId) params.set('client_id', clientId);
  if (status) params.set('status', status);
  const qs = params.toString();
  return fetchLiquidityApi<WithdrawalRequest[]>(
    `/api/v1/liquidity/withdrawals${qs ? `?${qs}` : ''}`
  );
}

export async function getWithdrawalRequest(requestId: string): Promise<WithdrawalRequest> {
  return fetchLiquidityApi<WithdrawalRequest>(`/api/v1/liquidity/withdrawals/${requestId}`);
}

export async function approveWithdrawal(
  requestId: string,
  planId?: string
): Promise<{ status: string; request_id: string }> {
  return fetchLiquidityApi(`/api/v1/liquidity/withdrawals/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
}

export async function executeWithdrawal(
  requestId: string
): Promise<{ status: string; plan_id: string }> {
  return fetchLiquidityApi(`/api/v1/liquidity/withdrawals/${requestId}/execute`, {
    method: 'POST',
  });
}

export async function cancelWithdrawal(
  requestId: string,
  reason?: string
): Promise<{ status: string; request_id: string }> {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return fetchLiquidityApi(`/api/v1/liquidity/withdrawals/${requestId}/cancel${params}`, {
    method: 'POST',
  });
}

export async function completeWithdrawal(
  requestId: string
): Promise<{ status: string; request_id: string }> {
  return fetchLiquidityApi(`/api/v1/liquidity/withdrawals/${requestId}/complete`, {
    method: 'POST',
  });
}

// ============================================================================
// PLANS API
// ============================================================================

export async function getWithdrawalPlans(requestId: string): Promise<WithdrawalPlan[]> {
  return fetchLiquidityApi<WithdrawalPlan[]>(
    `/api/v1/liquidity/withdrawals/${requestId}/plans`
  );
}

export async function getPlan(planId: string): Promise<WithdrawalPlan> {
  return fetchLiquidityApi<WithdrawalPlan>(`/api/v1/liquidity/plans/${planId}`);
}

export async function executePlan(
  planId: string
): Promise<WithdrawalPlan> {
  return fetchLiquidityApi<WithdrawalPlan>(`/api/v1/liquidity/plans/${planId}/execute`, {
    method: 'POST',
  });
}

// ============================================================================
// CASH FLOWS API
// ============================================================================

export async function getCashFlows(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<CashFlow[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return fetchLiquidityApi<CashFlow[]>(
    `/api/v1/liquidity/cash-flows/${clientId}${qs ? `?${qs}` : ''}`
  );
}

export async function createCashFlow(data: {
  client_id: string;
  flow_type: string;
  amount: number;
  expected_date: string;
  description?: string;
  account_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}): Promise<CashFlow> {
  return fetchLiquidityApi<CashFlow>('/api/v1/liquidity/cash-flows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
