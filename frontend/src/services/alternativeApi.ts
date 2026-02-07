/**
 * Alternative Asset Tracking API service.
 * Handles investments, capital calls, distributions, valuations,
 * documents (K-1), performance, and client summaries.
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
const BASE = '/api/v1/alternative-assets';

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

export type AlternativeAssetType =
  | 'private_equity'
  | 'venture_capital'
  | 'hedge_fund'
  | 'real_estate'
  | 'private_debt'
  | 'commodities'
  | 'collectibles'
  | 'infrastructure'
  | 'natural_resources'
  | 'cryptocurrency'
  | 'other';

export type InvestmentStatus =
  | 'committed'
  | 'active'
  | 'harvesting'
  | 'fully_realized'
  | 'written_off'
  | 'pending';

export interface AlternativeInvestment {
  id: string;
  advisor_id: string;
  client_id: string;
  account_id?: string;
  name: string;
  asset_type: AlternativeAssetType;
  status: InvestmentStatus;
  // Fund details
  fund_name?: string;
  sponsor_name?: string;
  fund_manager?: string;
  vintage_year?: number;
  investment_date?: string;
  maturity_date?: string;
  // Strategy
  investment_strategy?: string;
  geography?: string;
  sector_focus?: string;
  // Capital
  total_commitment: number;
  called_capital: number;
  uncalled_capital: number;
  distributions_received: number;
  recallable_distributions: number;
  // Valuation
  current_nav: number;
  nav_date?: string;
  // Cost basis
  cost_basis: number;
  adjusted_cost_basis: number;
  // Performance
  irr?: number;
  tvpi?: number;
  dpi?: number;
  rvpi?: number;
  moic?: number;
  // Fees
  management_fee_rate?: number;
  carried_interest_rate?: number;
  preferred_return?: number;
  // Tax
  tax_entity_type?: string;
  ein?: string;
  fiscal_year_end?: string;
  // Real estate
  property_address?: string;
  property_type?: string;
  square_footage?: number;
  // Collectibles
  item_description?: string;
  provenance?: string;
  storage_location?: string;
  insurance_policy?: string;
  insurance_value?: number;
  // Metadata
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  subscription_doc_url?: string;
  created_at?: string;
  // Eager-loaded children (on detail)
  transactions?: AlternativeTransaction[];
  valuations?: AlternativeValuation[];
  capital_calls?: CapitalCall[];
  documents?: AlternativeDocument[];
}

export interface CapitalCall {
  id: string;
  investment_id: string;
  call_number: number;
  notice_date: string;
  due_date: string;
  call_amount: number;
  management_fee_portion?: number;
  investment_portion?: number;
  other_expenses?: number;
  cumulative_called: number;
  remaining_commitment: number;
  percentage_called: number;
  status: string;
  paid_date?: string;
  paid_amount?: number;
  wire_instructions?: Record<string, unknown>;
  notice_url?: string;
  notes?: string;
  created_at?: string;
}

export interface AlternativeTransaction {
  id: string;
  investment_id: string;
  transaction_type: string;
  transaction_date: string;
  settlement_date?: string;
  amount: number;
  capital_call_id?: string;
  return_of_capital?: number;
  capital_gains_short?: number;
  capital_gains_long?: number;
  ordinary_income?: number;
  qualified_dividends?: number;
  reference_number?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface AlternativeValuation {
  id: string;
  investment_id: string;
  valuation_date: string;
  nav: number;
  source: string;
  source_document?: string;
  period_return?: number;
  ytd_return?: number;
  unrealized_gain?: number;
  realized_gain?: number;
  irr?: number;
  tvpi?: number;
  dpi?: number;
  notes?: string;
  created_at?: string;
}

export interface AlternativeDocument {
  id: string;
  investment_id: string;
  document_type: string;
  name: string;
  description?: string;
  document_date?: string;
  tax_year?: number;
  period_start?: string;
  period_end?: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  // K-1 fields
  k1_box_1?: number;
  k1_box_2?: number;
  k1_box_3?: number;
  k1_box_4a?: number;
  k1_box_5?: number;
  k1_box_6a?: number;
  k1_box_6b?: number;
  k1_box_8?: number;
  k1_box_9a?: number;
  k1_box_11?: number;
  k1_box_13?: Record<string, unknown>;
  k1_box_19?: number;
  k1_box_20?: Record<string, unknown>;
  is_processed: boolean;
  processed_at?: string;
  notes?: string;
  created_at?: string;
}

export interface ClientSummary {
  total_investments: number;
  total_commitment: number;
  total_called: number;
  total_uncalled: number;
  total_nav: number;
  total_distributions: number;
  nav_by_type: Record<string, number>;
  commitment_by_type: Record<string, number>;
  pending_capital_calls: number;
  pending_call_amount: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// -- Investments ---------------------------------------------------------------

export function createInvestment(data: Partial<AlternativeInvestment>) {
  return fetchJson<AlternativeInvestment>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listInvestments(params?: {
  client_id?: string;
  asset_type?: string;
  status?: string;
}) {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
  return fetchJson<{ investments: AlternativeInvestment[]; total: number }>(
    `${BASE}${qs}`,
  );
}

export function getInvestment(id: string) {
  return fetchJson<AlternativeInvestment>(`${BASE}/${id}`);
}

export function updateInvestment(id: string, data: Partial<AlternativeInvestment>) {
  return fetchJson<AlternativeInvestment>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteInvestment(id: string) {
  return fetchJson<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

// -- Capital Calls ------------------------------------------------------------

export function createCapitalCall(investmentId: string, data: Partial<CapitalCall>) {
  return fetchJson<CapitalCall>(`${BASE}/${investmentId}/capital-calls`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listCapitalCalls(investmentId: string) {
  return fetchJson<{ calls: CapitalCall[]; total: number }>(
    `${BASE}/${investmentId}/capital-calls`,
  );
}

export function payCapitalCall(callId: string, paidDate: string, paidAmount?: number) {
  return fetchJson<CapitalCall>(`${BASE}/capital-calls/${callId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paid_date: paidDate, paid_amount: paidAmount }),
  });
}

export function getPendingCalls(daysAhead = 30) {
  return fetchJson<{ calls: CapitalCall[]; total: number; total_amount: number }>(
    `${BASE}/capital-calls/pending?days_ahead=${daysAhead}`,
  );
}

// -- Distributions & Transactions ---------------------------------------------

export function recordDistribution(
  investmentId: string,
  data: {
    transaction_date: string;
    amount: number;
    transaction_type?: string;
    return_of_capital?: number;
    capital_gains_short?: number;
    capital_gains_long?: number;
    ordinary_income?: number;
    qualified_dividends?: number;
    reference_number?: string;
    notes?: string;
  },
) {
  return fetchJson<AlternativeTransaction>(`${BASE}/${investmentId}/distributions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listTransactions(investmentId: string) {
  return fetchJson<{ transactions: AlternativeTransaction[]; total: number }>(
    `${BASE}/${investmentId}/transactions`,
  );
}

// -- Valuations ---------------------------------------------------------------

export function recordValuation(
  investmentId: string,
  data: {
    valuation_date: string;
    nav: number;
    source?: string;
    source_document?: string;
    period_return?: number;
    ytd_return?: number;
    unrealized_gain?: number;
    realized_gain?: number;
    notes?: string;
  },
) {
  return fetchJson<AlternativeValuation>(`${BASE}/${investmentId}/valuations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getValuationHistory(investmentId: string, limit = 12) {
  return fetchJson<{ valuations: AlternativeValuation[]; total: number }>(
    `${BASE}/${investmentId}/valuations?limit=${limit}`,
  );
}

// -- Documents ----------------------------------------------------------------

export function addDocument(
  investmentId: string,
  data: Partial<AlternativeDocument>,
) {
  return fetchJson<AlternativeDocument>(`${BASE}/${investmentId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listDocuments(investmentId: string, documentType?: string) {
  const qs = documentType ? `?document_type=${documentType}` : '';
  return fetchJson<{ documents: AlternativeDocument[]; total: number }>(
    `${BASE}/${investmentId}/documents${qs}`,
  );
}

export function getK1sByYear(taxYear: number, clientId?: string) {
  const clientQs = clientId ? `&client_id=${clientId}` : '';
  return fetchJson<{ k1s: AlternativeDocument[]; total: number; tax_year: number }>(
    `${BASE}/documents/k1s?tax_year=${taxYear}${clientQs}`,
  );
}

// -- Performance & Summary ----------------------------------------------------

export function recalculatePerformance(investmentId: string) {
  return fetchJson<AlternativeInvestment>(`${BASE}/${investmentId}/recalculate`, {
    method: 'POST',
  });
}

export function getClientSummary(clientId: string) {
  return fetchJson<ClientSummary>(`${BASE}/clients/${clientId}/summary`);
}
