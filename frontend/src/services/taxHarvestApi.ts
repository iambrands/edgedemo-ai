/**
 * Tax-Loss Harvesting API service.
 * Handles scanning, opportunities, recommendations, workflow actions,
 * wash sale monitoring, and harvesting settings.
 */

// ============================================================================
// API BASE
// ============================================================================

function getApiBase(): string {
  let url = import.meta.env.VITE_API_URL || '';
  if (url.includes('VITE_API_URL=')) url = url.replace(/.*VITE_API_URL=/i, '');
  if (url.includes('railway.app') && url.startsWith('http://'))
    url = url.replace('http://', 'https://');
  return url;
}

const API_BASE = getApiBase();
const BASE = '/api/v1/tax-harvest';

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('edgeai_token') ||
    sessionStorage.getItem('edgeai_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...((options.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ============================================================================
// TYPES
// ============================================================================

export type HarvestStatus =
  | 'identified'
  | 'recommended'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'expired'
  | 'rejected'
  | 'wash_sale_risk';

export type WashSaleStatus = 'clear' | 'in_window' | 'violated' | 'adjusted';

export interface HarvestOpportunity {
  id: string;
  client_id?: string;
  account_id: string;
  symbol: string;
  security_name: string;
  quantity_to_harvest: number;
  current_price: number;
  cost_basis: number;
  market_value: number;
  unrealized_loss: number;
  estimated_tax_savings: number;
  short_term_loss: number;
  long_term_loss: number;
  status: HarvestStatus;
  wash_sale_status: WashSaleStatus;
  wash_sale_risk_amount?: number;
  wash_sale_window_start?: string;
  wash_sale_window_end?: string;
  replacement_recommendations?: ReplacementRecommendation[];
  replacement_symbol?: string;
  identified_at: string;
  expires_at?: string;
  approved_at?: string;
  executed_at?: string;
}

export interface ReplacementRecommendation {
  symbol: string;
  name?: string;
  reason: string;
  correlation: number;
  source: string;
  wash_sale_safe: boolean;
}

export interface OpportunitySummary {
  total_opportunities: number;
  total_harvestable_loss: number;
  total_estimated_savings: number;
}

export interface WashSaleWindow {
  id: string;
  symbol: string;
  sale_date: string;
  loss_amount: number;
  window_start: string;
  window_end: string;
  watch_symbols?: string[];
  status: WashSaleStatus;
  violation_date?: string;
  disallowed_loss?: number;
}

export interface WashSaleCheckResult {
  symbol: string;
  is_safe: boolean;
  active_windows: WashSaleWindow[];
}

export interface HarvestingSettings {
  id: string;
  min_loss_amount: number;
  min_loss_percentage: number;
  min_tax_savings: number;
  short_term_tax_rate: number;
  long_term_tax_rate: number;
  auto_identify: boolean;
  auto_recommend: boolean;
  require_approval: boolean;
  excluded_symbols?: string[];
  notify_on_opportunity: boolean;
  notify_on_wash_sale_risk: boolean;
  is_active: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/** Scan portfolio for new harvesting opportunities. */
export async function scanPortfolio(
  clientId?: string,
  accountId?: string,
): Promise<HarvestOpportunity[]> {
  const data = await fetchJson<{ opportunities: HarvestOpportunity[]; total: number }>(
    `${BASE}/scan`,
    { method: 'POST', body: JSON.stringify({ client_id: clientId, account_id: accountId }) },
  );
  return data.opportunities;
}

/** List existing opportunities with optional filters. */
export async function getOpportunities(
  clientId?: string,
  status?: HarvestStatus,
): Promise<HarvestOpportunity[]> {
  const params = new URLSearchParams();
  if (clientId) params.set('client_id', clientId);
  if (status) params.set('status', status);
  const qs = params.toString();
  const data = await fetchJson<{ opportunities: HarvestOpportunity[]; total: number }>(
    `${BASE}/opportunities${qs ? `?${qs}` : ''}`,
  );
  return data.opportunities;
}

/** Get single opportunity by ID. */
export async function getOpportunity(id: string): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}`);
}

/** Get summary statistics. */
export async function getSummary(clientId?: string): Promise<OpportunitySummary> {
  const qs = clientId ? `?client_id=${clientId}` : '';
  return fetchJson<OpportunitySummary>(`${BASE}/opportunities/summary${qs}`);
}

/** Get replacement recommendations for an opportunity. */
export async function getRecommendations(
  opportunityId: string,
): Promise<ReplacementRecommendation[]> {
  const data = await fetchJson<{
    opportunity_id: string;
    symbol: string;
    recommendations: ReplacementRecommendation[];
  }>(`${BASE}/opportunities/${opportunityId}/recommendations`);
  return data.recommendations;
}

/** Mark opportunity as recommended. */
export async function recommendOpportunity(id: string): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}/recommend`, {
    method: 'POST',
  });
}

/** Approve opportunity with optional replacement selection. */
export async function approveOpportunity(
  id: string,
  replacementSymbol?: string,
  notes?: string,
): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ replacement_symbol: replacementSymbol, notes }),
  });
}

/** Reject opportunity. */
export async function rejectOpportunity(
  id: string,
  reason: string,
): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Mark opportunity as executing. */
export async function markExecuting(id: string): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}/executing`, {
    method: 'POST',
  });
}

/** Mark opportunity as executed. */
export async function markExecuted(
  id: string,
  sellTxnId: string,
  buyTxnId?: string,
  actualLoss?: number,
): Promise<HarvestOpportunity> {
  return fetchJson<HarvestOpportunity>(`${BASE}/opportunities/${id}/executed`, {
    method: 'POST',
    body: JSON.stringify({
      sell_transaction_id: sellTxnId,
      buy_transaction_id: buyTxnId,
      actual_loss: actualLoss,
    }),
  });
}

/** Get active wash sale windows. */
export async function getWashSales(symbol?: string): Promise<WashSaleWindow[]> {
  const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  return fetchJson<WashSaleWindow[]>(`${BASE}/wash-sales${qs}`);
}

/** Check if buying a symbol would trigger a wash sale. */
export async function checkWashSale(symbol: string): Promise<WashSaleCheckResult> {
  return fetchJson<WashSaleCheckResult>(
    `${BASE}/wash-sales/check/${encodeURIComponent(symbol)}`,
  );
}

/** Get harvesting settings. */
export async function getSettings(clientId?: string): Promise<HarvestingSettings> {
  const qs = clientId ? `?client_id=${clientId}` : '';
  return fetchJson<HarvestingSettings>(`${BASE}/settings${qs}`);
}

/** Update harvesting settings. */
export async function updateSettings(
  settings: Partial<HarvestingSettings>,
  clientId?: string,
): Promise<HarvestingSettings> {
  const qs = clientId ? `?client_id=${clientId}` : '';
  return fetchJson<HarvestingSettings>(`${BASE}/settings${qs}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
