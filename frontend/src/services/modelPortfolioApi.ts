/**
 * Model Portfolio Marketplace API service.
 * Handles model CRUD, holdings, marketplace, subscriptions, assignments, and rebalancing.
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
const BASE = '/api/v1/model-portfolios';

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

export type ModelStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ModelVisibility = 'private' | 'firm' | 'marketplace';
export type RebalanceSignalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'expired'
  | 'failed';

export interface ModelHolding {
  id: string;
  model_id: string;
  symbol: string;
  security_name: string;
  security_type: string;
  asset_class: string;
  sub_asset_class?: string;
  target_weight_pct: number;
  min_weight_pct?: number;
  max_weight_pct?: number;
  expense_ratio?: number;
  created_at?: string;
}

export interface ModelPortfolio {
  id: string;
  advisor_id: string;
  name: string;
  ticker?: string;
  description?: string;
  category: string;
  risk_level: number;
  investment_style?: string;
  status: ModelStatus;
  visibility: ModelVisibility;
  rebalance_frequency: string;
  drift_threshold_pct: number;
  tax_loss_harvesting_enabled: boolean;
  benchmark_symbol?: string;
  target_return?: number;
  target_volatility?: number;
  tags?: string[];
  // Performance
  ytd_return?: number;
  one_year_return?: number;
  three_year_return?: number;
  inception_return?: number;
  inception_date?: string;
  // Marketplace
  subscription_fee_monthly?: number;
  subscription_fee_annual?: number;
  total_subscribers: number;
  total_aum: number;
  // Holdings
  holdings: ModelHolding[];
  created_at?: string;
}

export interface ModelSubscription {
  id: string;
  model_id: string;
  subscriber_advisor_id: string;
  status: string;
  custom_drift_threshold?: number;
  cancelled_at?: string;
  created_at?: string;
}

export interface AccountAssignment {
  id: string;
  subscription_id: string;
  account_id: string;
  model_id: string;
  client_id?: string;
  assigned_by: string;
  is_active: boolean;
  account_value?: number;
  current_drift_pct?: number;
  max_holding_drift_pct?: number;
  last_rebalanced_at?: string;
  last_synced_at?: string;
  created_at?: string;
}

export interface RebalanceSignal {
  id: string;
  assignment_id: string;
  model_id: string;
  account_id: string;
  advisor_id: string;
  trigger_type: string;
  trigger_value?: number;
  status: RebalanceSignalStatus;
  account_value: number;
  cash_available: number;
  total_drift_pct: number;
  drift_details?: Record<string, any>;
  trades_required?: Array<Record<string, any>>;
  estimated_trades_count: number;
  estimated_buy_value: number;
  estimated_sell_value: number;
  notes?: string;
  rejection_reason?: string;
  approved_at?: string;
  executed_at?: string;
  expires_at?: string;
  created_at?: string;
}

export interface HoldingsValidation {
  total_weight: number;
  is_valid: boolean;
  difference: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// ── Model CRUD ─────────────────────────────────────────────

export function createModel(data: Record<string, any>): Promise<ModelPortfolio> {
  return fetchJson<ModelPortfolio>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listModels(params?: {
  status?: string;
  include_subscribed?: boolean;
}): Promise<{ models: ModelPortfolio[]; total: number }> {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return fetchJson(`${BASE}${qs}`);
}

export function getModel(id: string): Promise<ModelPortfolio> {
  return fetchJson(`${BASE}/${id}`);
}

export function updateModel(
  id: string,
  data: Record<string, any>,
): Promise<ModelPortfolio> {
  return fetchJson(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteModel(id: string): Promise<void> {
  return fetchJson(`${BASE}/${id}`, { method: 'DELETE' });
}

// ── Holdings ───────────────────────────────────────────────

export function addHolding(
  modelId: string,
  data: Record<string, any>,
): Promise<ModelHolding> {
  return fetchJson(`${BASE}/${modelId}/holdings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHolding(
  modelId: string,
  holdingId: string,
  data: Record<string, any>,
): Promise<ModelHolding> {
  return fetchJson(`${BASE}/${modelId}/holdings/${holdingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function removeHolding(modelId: string, holdingId: string): Promise<void> {
  return fetchJson(`${BASE}/${modelId}/holdings/${holdingId}`, { method: 'DELETE' });
}

export function validateHoldings(modelId: string): Promise<HoldingsValidation> {
  return fetchJson(`${BASE}/${modelId}/holdings/validate`);
}

// ── Marketplace ────────────────────────────────────────────

export function browseMarketplace(params?: {
  category?: string;
  risk_level_min?: number;
  risk_level_max?: number;
  search?: string;
}): Promise<{ models: ModelPortfolio[]; total: number }> {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return fetchJson(`${BASE}/marketplace/browse${qs}`);
}

export function publishToMarketplace(
  modelId: string,
  fees?: { subscription_fee_monthly?: number; subscription_fee_annual?: number },
): Promise<ModelPortfolio> {
  return fetchJson(`${BASE}/${modelId}/publish`, {
    method: 'POST',
    body: JSON.stringify(fees || {}),
  });
}

// ── Subscriptions ──────────────────────────────────────────

export function subscribe(modelId: string): Promise<ModelSubscription> {
  return fetchJson(`${BASE}/${modelId}/subscribe`, { method: 'POST' });
}

export function unsubscribe(subscriptionId: string): Promise<void> {
  return fetchJson(`${BASE}/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

// ── Account Assignments ────────────────────────────────────

export function assignToAccount(
  subscriptionId: string,
  accountId: string,
  clientId?: string,
): Promise<AccountAssignment> {
  return fetchJson(`${BASE}/subscriptions/${subscriptionId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ account_id: accountId, client_id: clientId }),
  });
}

export function listAssignments(
  modelId?: string,
): Promise<{ assignments: AccountAssignment[]; total: number }> {
  const qs = modelId ? `?model_id=${modelId}` : '';
  return fetchJson(`${BASE}/assignments${qs}`);
}

// ── Rebalancing ────────────────────────────────────────────

export function checkDrift(): Promise<{
  signals_generated: number;
  signals: RebalanceSignal[];
}> {
  return fetchJson(`${BASE}/rebalance/check`, { method: 'POST' });
}

export function listSignals(): Promise<{
  signals: RebalanceSignal[];
  total: number;
  pending: number;
}> {
  return fetchJson(`${BASE}/rebalance/signals`);
}

export function approveSignal(
  signalId: string,
  notes?: string,
): Promise<RebalanceSignal> {
  return fetchJson(`${BASE}/rebalance/signals/${signalId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function rejectSignal(
  signalId: string,
  reason: string,
): Promise<RebalanceSignal> {
  return fetchJson(`${BASE}/rebalance/signals/${signalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
