/**
 * Prospect Pipeline API service.
 * Handles prospect CRUD, pipeline analytics, activities, proposals,
 * conversion workflow, and lead scoring.
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
const BASE = '/api/v1/prospects';

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

export type ProspectStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'nurturing';

export type LeadSource =
  | 'website'
  | 'referral'
  | 'linkedin'
  | 'seminar'
  | 'cold_outreach'
  | 'advertising'
  | 'partnership'
  | 'existing_client'
  | 'other';

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'video_call'
  | 'text'
  | 'linkedin_message'
  | 'voicemail'
  | 'note'
  | 'task'
  | 'proposal'
  | 'document_sent'
  | 'document_signed';

export type ProposalStatusType =
  | 'draft'
  | 'review'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revised';

export interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status: ProspectStatus;
  lead_source: LeadSource;
  source_detail?: string;
  estimated_aum?: number;
  annual_income?: number;
  net_worth?: number;
  risk_tolerance?: string;
  investment_goals?: string[];
  time_horizon?: string;
  interested_services?: string[];
  lead_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  next_action_date?: string;
  next_action_type?: string;
  next_action_notes?: string;
  days_in_stage: number;
  total_days_in_pipeline: number;
  tags?: string[];
  notes?: string;
  ai_summary?: string;
  converted_at?: string;
  lost_reason?: string;
  created_at: string;
}

export interface Activity {
  id: string;
  prospect_id: string;
  activity_type: ActivityType;
  subject?: string;
  description?: string;
  activity_date: string;
  duration_minutes?: number;
  call_outcome?: string;
  call_direction?: string;
  email_status?: string;
  meeting_outcome?: string;
  task_due_date?: string;
  task_completed: boolean;
  status_before?: string;
  status_after?: string;
  is_automated: boolean;
  created_at: string;
}

export interface Proposal {
  id: string;
  prospect_id: string;
  title: string;
  proposal_number?: string;
  version: number;
  status: ProposalStatusType;
  executive_summary?: string;
  investment_philosophy?: string;
  proposed_strategy?: string;
  fee_structure?: string;
  proposed_aum?: number;
  proposed_fee_percent?: number;
  estimated_annual_fee?: number;
  risk_profile?: string;
  risk_assessment?: string;
  valid_until?: string;
  is_ai_generated: boolean;
  ai_confidence_score?: number;
  sent_at?: string;
  viewed_at?: string;
  view_count: number;
  document_url?: string;
  created_at: string;
}

export interface PipelineSummary {
  stages: Record<string, { count: number; value: number }>;
  total_prospects: number;
  total_pipeline_value: number;
}

export interface ConversionMetrics {
  period_days: number;
  total_created: number;
  won: number;
  lost: number;
  conversion_rate: number;
  in_progress: number;
}

export interface ScoreResult {
  prospect_id: string;
  lead_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// -- Prospects ---------------------------------------------------------------

export function createProspect(data: Record<string, unknown>): Promise<Prospect> {
  return fetchJson<Prospect>(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export function listProspects(params?: {
  status?: string;
  lead_source?: string;
  min_score?: number;
  search?: string;
  tags?: string;
  page?: number;
  page_size?: number;
}): Promise<{ prospects: Prospect[]; total: number; page: number; page_size: number }> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
  }
  const query = qs.toString();
  return fetchJson(`${BASE}${query ? `?${query}` : ''}`);
}

export function getProspect(id: string): Promise<Prospect> {
  return fetchJson<Prospect>(`${BASE}/${id}`);
}

export function updateProspect(id: string, data: Record<string, unknown>): Promise<Prospect> {
  return fetchJson<Prospect>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteProspect(id: string): Promise<void> {
  return fetchJson<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

// -- Pipeline Analytics ------------------------------------------------------

export function getPipelineSummary(): Promise<PipelineSummary> {
  return fetchJson<PipelineSummary>(`${BASE}/pipeline/summary`);
}

export function getConversionMetrics(days = 90): Promise<ConversionMetrics> {
  return fetchJson<ConversionMetrics>(`${BASE}/pipeline/metrics?days=${days}`);
}

// -- Activities --------------------------------------------------------------

export function logActivity(
  prospectId: string,
  data: Record<string, unknown>,
): Promise<Activity> {
  return fetchJson<Activity>(`${BASE}/${prospectId}/activities`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getActivities(
  prospectId: string,
  params?: { activity_type?: string; limit?: number },
): Promise<{ activities: Activity[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.activity_type) qs.set('activity_type', params.activity_type);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return fetchJson(`${BASE}/${prospectId}/activities${query ? `?${query}` : ''}`);
}

export function getPendingTasks(): Promise<{ tasks: Activity[]; total: number }> {
  return fetchJson(`${BASE}/tasks/pending`);
}

// -- Proposals ---------------------------------------------------------------

export function generateProposal(
  prospectId: string,
  customParams?: Record<string, unknown>,
): Promise<Proposal> {
  return fetchJson<Proposal>(`${BASE}/${prospectId}/proposals/generate`, {
    method: 'POST',
    body: JSON.stringify({ custom_params: customParams }),
  });
}

export function getProposals(
  prospectId: string,
): Promise<{ proposals: Proposal[]; total: number }> {
  return fetchJson(`${BASE}/${prospectId}/proposals`);
}

export function updateProposalStatus(
  proposalId: string,
  status: string,
  notes?: string,
): Promise<Proposal> {
  return fetchJson<Proposal>(`${BASE}/proposals/${proposalId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

// -- Conversion --------------------------------------------------------------

export function convertToClient(prospectId: string, clientId: string): Promise<Prospect> {
  return fetchJson<Prospect>(`${BASE}/${prospectId}/convert`, {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId }),
  });
}

export function markLost(
  prospectId: string,
  reason: string,
  lostTo?: string,
): Promise<Prospect> {
  return fetchJson<Prospect>(`${BASE}/${prospectId}/lost`, {
    method: 'POST',
    body: JSON.stringify({ reason, lost_to: lostTo }),
  });
}

// -- Scoring -----------------------------------------------------------------

export function rescoreProspect(prospectId: string): Promise<ScoreResult> {
  return fetchJson<ScoreResult>(`${BASE}/${prospectId}/score`, { method: 'POST' });
}

export function rescoreAll(): Promise<{ rescored: number }> {
  return fetchJson(`${BASE}/score/all`, { method: 'POST' });
}
