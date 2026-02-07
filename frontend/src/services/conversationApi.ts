/**
 * Conversation Intelligence API service.
 * Handles transcript analysis, compliance flags, action items, and metrics.
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
const BASE = '/api/v1/conversations';

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

export type SentimentType =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative';

export type ComplianceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type ActionItemPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ConversationAnalysis {
  id: string;
  meeting_id: string;
  analysis_status: string;
  analyzed_at?: string;

  // Duration / Talk-Time
  total_duration_seconds: number;
  talk_time_advisor_seconds: number;
  talk_time_client_seconds: number;
  talk_ratio?: number;

  // Sentiment
  overall_sentiment: SentimentType;
  sentiment_score?: number;

  // Engagement
  engagement_score: number;

  // Topics
  topics_discussed?: string[];
  primary_topic?: string;

  // Summary
  key_points?: string[];
  decisions_made?: string[];
  concerns_raised?: string[];
  executive_summary?: string;
  detailed_summary?: string;
  follow_up_recommendations?: string[];

  // Counts
  compliance_flags_count: number;
  compliance_risk_level: ComplianceRiskLevel;
  action_items_count: number;

  // Nested (present on detail endpoints)
  compliance_flags?: ComplianceFlag[];
  action_items?: ActionItem[];

  created_at: string;
}

export interface ComplianceFlag {
  id: string;
  analysis_id: string;
  category: string;
  risk_level: ComplianceRiskLevel;
  flagged_text: string;
  timestamp_start: number;
  timestamp_end: number;
  speaker?: string;
  ai_explanation: string;
  ai_confidence: number;
  suggested_correction?: string;
  regulatory_reference?: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  remediation_required: boolean;
  remediation_action?: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  analysis_id: string;
  title: string;
  description?: string;
  source_text?: string;
  owner_type: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  due_date?: string;
  completed_at?: string;
  category?: string;
  ai_generated: boolean;
  created_at: string;
}

export interface ConversationMetrics {
  period_days: number;
  total_conversations: number;
  avg_sentiment_score?: number;
  avg_engagement_score: number;
  total_compliance_flags: number;
  action_items_created: number;
  action_items_completed: number;
  top_topics: Record<string, number>;
}

export interface ComplianceSummary {
  total_flags: number;
  pending_review: number;
  by_risk_level: Record<string, number>;
  by_category: Record<string, number>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// ── Analyses ────────────────────────────────────────────────────

export function analyzeTranscript(
  meetingId: string,
  transcript: string,
  segments: Record<string, unknown>[],
  clientId?: string,
): Promise<ConversationAnalysis> {
  return fetchJson<ConversationAnalysis>(`${BASE}/analyze`, {
    method: 'POST',
    body: JSON.stringify({
      meeting_id: meetingId,
      transcript,
      segments,
      client_id: clientId,
    }),
  });
}

export function listAnalyses(
  days = 30,
  clientId?: string,
): Promise<{ analyses: ConversationAnalysis[]; total: number }> {
  let url = `${BASE}/analyses?days=${days}`;
  if (clientId) url += `&client_id=${clientId}`;
  return fetchJson(url);
}

export function getAnalysis(
  id: string,
): Promise<ConversationAnalysis> {
  return fetchJson(`${BASE}/analyses/${id}`);
}

export function getAnalysisByMeeting(
  meetingId: string,
): Promise<ConversationAnalysis> {
  return fetchJson(`${BASE}/meetings/${meetingId}/analysis`);
}

// ── Compliance ──────────────────────────────────────────────────

export function listFlags(
  params?: { status?: string; risk_level?: string; days?: number },
): Promise<{ flags: ComplianceFlag[]; total: number; pending: number; high_risk: number }> {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';
  return fetchJson(`${BASE}/compliance/flags${qs}`);
}

export function getPendingFlags(): Promise<{ flags: ComplianceFlag[]; total: number }> {
  return fetchJson(`${BASE}/compliance/flags/pending`);
}

export function reviewFlag(
  flagId: string,
  status: string,
  notes?: string,
  remediationAction?: string,
): Promise<ComplianceFlag> {
  return fetchJson(`${BASE}/compliance/flags/${flagId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      notes,
      remediation_action: remediationAction,
    }),
  });
}

export function getComplianceSummary(
  days = 30,
): Promise<ComplianceSummary> {
  return fetchJson(`${BASE}/compliance/summary?days=${days}`);
}

// ── Action Items ────────────────────────────────────────────────

export function listActionItems(
  params?: { status?: string; days?: number },
): Promise<{ items: ActionItem[]; total: number; pending: number; overdue: number }> {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';
  return fetchJson(`${BASE}/action-items${qs}`);
}

export function getPendingActionItems(): Promise<{
  items: ActionItem[];
  total: number;
  overdue: number;
}> {
  return fetchJson(`${BASE}/action-items/pending`);
}

export function updateActionItem(
  itemId: string,
  status?: string,
  notes?: string,
): Promise<ActionItem> {
  return fetchJson(`${BASE}/action-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

// ── Metrics ─────────────────────────────────────────────────────

export function getMetrics(
  days = 30,
): Promise<ConversationMetrics> {
  return fetchJson(`${BASE}/metrics?days=${days}`);
}
