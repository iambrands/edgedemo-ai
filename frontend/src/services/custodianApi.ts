/**
 * Multi-Custodian Aggregation API service.
 * Handles custodian connections, sync, accounts, positions, allocation, and transactions.
 */

// ============================================================================
// API BASE
// ============================================================================

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
const BASE = '/api/v1/custodians';

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
    headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
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

export type CustodianType =
  | 'schwab'
  | 'fidelity'
  | 'pershing'
  | 'td_ameritrade'
  | 'interactive_brokers'
  | 'apex'
  | 'altruist'
  | 'manual';

export type ConnectionStatus = 'pending' | 'connected' | 'expired' | 'revoked' | 'error';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'failed';

export interface CustodianPlatform {
  id: string;
  custodian_type: CustodianType;
  display_name: string;
  supports_oauth: boolean;
  supports_realtime: boolean;
  is_active: boolean;
  maintenance_message?: string;
}

export interface CustodianConnection {
  id: string;
  custodian_id: string;
  custodian_type: CustodianType;
  custodian_name: string;
  status: ConnectionStatus;
  last_sync_at?: string;
  last_sync_status?: SyncStatus;
  last_error?: string;
  sync_frequency_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CustodianAccount {
  id: string;
  connection_id: string;
  custodian_type: CustodianType;
  custodian_name: string;
  external_account_id: string;
  account_name: string;
  account_type: string;
  tax_status: string;
  market_value: number;
  cash_balance: number;
  client_id?: string;
  household_id?: string;
  is_active: boolean;
  last_sync_at?: string;
}

export interface UnifiedPosition {
  symbol: string;
  cusip?: string;
  security_name: string;
  asset_class: string;
  total_quantity: number;
  total_market_value: number;
  total_cost_basis: number;
  unrealized_gain_loss?: number;
  accounts: { account_id: string; quantity: number; market_value: number }[];
}

export interface AssetAllocationItem {
  asset_class: string;
  market_value: number;
  percentage: number;
}

export interface AssetAllocation {
  total_value: number;
  allocation: AssetAllocationItem[];
}

export interface CustodianTransaction {
  id: string;
  account_id: string;
  account_name: string;
  custodian: string;
  transaction_type: string;
  symbol?: string;
  security_name?: string;
  quantity?: number;
  price?: number;
  gross_amount: number;
  net_amount: number;
  trade_date: string;
  settlement_date?: string;
  description?: string;
  is_pending: boolean;
}

export interface SyncLog {
  id: string;
  connection_id: string;
  custodian_name: string;
  sync_type: string;
  status: SyncStatus;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  accounts_synced: number;
  positions_synced: number;
  transactions_synced: number;
  error_message?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// ── Discovery ─────────────────────────────────────────────────

export async function getAvailableCustodians(): Promise<CustodianPlatform[]> {
  const data = await fetchJson<{ custodians: CustodianPlatform[]; total: number }>(
    `${BASE}/available`,
  );
  return data.custodians;
}

// ── Connections ───────────────────────────────────────────────

export async function initiateConnection(
  custodianType: CustodianType,
  redirectUri: string,
): Promise<{ authorization_url: string; state: string; custodian_type: CustodianType }> {
  return fetchJson(`${BASE}/connections/initiate`, {
    method: 'POST',
    body: JSON.stringify({ custodian_type: custodianType, redirect_uri: redirectUri }),
  });
}

export async function completeConnection(
  custodianType: CustodianType,
  code: string,
  state: string,
  redirectUri: string,
): Promise<CustodianConnection> {
  return fetchJson(`${BASE}/connections/complete`, {
    method: 'POST',
    body: JSON.stringify({
      custodian_type: custodianType,
      code,
      state,
      redirect_uri: redirectUri,
    }),
  });
}

export async function listConnections(
  status?: ConnectionStatus,
): Promise<CustodianConnection[]> {
  const qs = status ? `?status=${status}` : '';
  const data = await fetchJson<{ connections: CustodianConnection[]; total: number }>(
    `${BASE}/connections${qs}`,
  );
  return data.connections;
}

export async function disconnectCustodian(connectionId: string): Promise<void> {
  await fetchJson(`${BASE}/connections/${connectionId}`, { method: 'DELETE' });
}

// ── Sync ──────────────────────────────────────────────────────

export async function triggerSync(
  connectionId: string,
  syncType = 'full',
): Promise<SyncLog> {
  return fetchJson(`${BASE}/connections/${connectionId}/sync`, {
    method: 'POST',
    body: JSON.stringify({ sync_type: syncType }),
  });
}

export async function getSyncLogs(
  connectionId: string,
  limit = 20,
): Promise<SyncLog[]> {
  const data = await fetchJson<{ logs: SyncLog[]; total: number }>(
    `${BASE}/connections/${connectionId}/sync-logs?limit=${limit}`,
  );
  return data.logs;
}

// ── Accounts ──────────────────────────────────────────────────

export async function listAccounts(params?: {
  client_id?: string;
  household_id?: string;
  unmapped_only?: boolean;
}): Promise<{
  accounts: CustodianAccount[];
  total: number;
  total_market_value: number;
  total_cash_balance: number;
}> {
  const qs = new URLSearchParams();
  if (params?.client_id) qs.set('client_id', params.client_id);
  if (params?.household_id) qs.set('household_id', params.household_id);
  if (params?.unmapped_only) qs.set('unmapped_only', 'true');
  const q = qs.toString();
  return fetchJson(`${BASE}/accounts${q ? `?${q}` : ''}`);
}

export async function mapAccountToClient(
  accountId: string,
  clientId: string,
  householdId?: string,
): Promise<CustodianAccount> {
  return fetchJson(`${BASE}/accounts/${accountId}/map`, {
    method: 'PATCH',
    body: JSON.stringify({ client_id: clientId, household_id: householdId }),
  });
}

// ── Portfolio ─────────────────────────────────────────────────

export async function getPositions(params?: {
  client_id?: string;
  asset_class?: string;
}): Promise<{
  positions: UnifiedPosition[];
  total_positions: number;
  total_market_value: number;
  total_cost_basis: number;
}> {
  const qs = new URLSearchParams();
  if (params?.client_id) qs.set('client_id', params.client_id);
  if (params?.asset_class) qs.set('asset_class', params.asset_class);
  const q = qs.toString();
  return fetchJson(`${BASE}/positions${q ? `?${q}` : ''}`);
}

export async function getAllocation(params?: {
  client_id?: string;
}): Promise<AssetAllocation> {
  const qs = params?.client_id ? `?client_id=${params.client_id}` : '';
  return fetchJson(`${BASE}/asset-allocation${qs}`);
}

// ── Transactions ──────────────────────────────────────────────

export async function getTransactions(params?: {
  account_id?: string;
  client_id?: string;
  transaction_type?: string;
  symbol?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  transactions: CustodianTransaction[];
  total: number;
  page: number;
  page_size: number;
}> {
  const qs = new URLSearchParams();
  if (params?.account_id) qs.set('account_id', params.account_id);
  if (params?.client_id) qs.set('client_id', params.client_id);
  if (params?.transaction_type) qs.set('transaction_type', params.transaction_type);
  if (params?.symbol) qs.set('symbol', params.symbol);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const q = qs.toString();
  return fetchJson(`${BASE}/transactions${q ? `?${q}` : ''}`);
}
