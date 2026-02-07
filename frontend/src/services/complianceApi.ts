/**
 * Compliance Documents API service.
 * Handles ADV Part 2B, Form CRS generation and management.
 */

// Use environment variable for production, empty string for dev (uses Vite proxy)
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

export interface ADVPart2BData {
  id?: string;
  advisor_id: string;
  firm_id?: string;
  full_name: string;
  crd_number?: string;
  business_address?: string;
  business_phone?: string;
  education?: Array<{ degree: string; institution: string; year: string }>;
  certifications?: Array<{ name: string; issuer: string; year: string; expiration?: string }>;
  employment_history?: Array<{ firm: string; title: string; start: string; end?: string }>;
  has_disciplinary_history: boolean;
  disciplinary_disclosure?: string;
  other_business_activities?: Array<{ activity: string; compensation_type: string; time_spent?: string }>;
  outside_business_conflicts?: string;
  additional_compensation_sources?: Array<{ source: string; description: string }>;
  economic_benefit_disclosure?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  supervision_description?: string;
  updated_at?: string;
}

export interface FormCRSData {
  id?: string;
  firm_id?: string;
  firm_name: string;
  crd_number?: string;
  sec_number?: string;
  is_broker_dealer: boolean;
  is_investment_adviser: boolean;
  services_offered?: Array<{ service: string; description: string; limitations?: string }>;
  account_minimums?: { minimum_aum?: number; minimum_fee?: number };
  investment_authority?: string;
  account_monitoring?: string;
  fee_structure?: Array<{ fee_type: string; description: string; typical_range?: string }>;
  other_fees?: Array<{ fee_type: string; description: string }>;
  fee_impact_example?: string;
  standard_of_conduct?: string;
  conflicts_of_interest?: Array<{ conflict: string; mitigation?: string }>;
  has_disciplinary_history: boolean;
  disciplinary_link?: string;
  additional_info_link?: string;
  conversation_starters?: string[];
  updated_at?: string;
}

export interface ComplianceDocument {
  id: string;
  document_type: string;
  title: string;
  description?: string;
  status: string;
  current_version_id?: string;
  effective_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  status: string;
  ai_generated: boolean;
  ai_model?: string;
  change_summary?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface DocumentDelivery {
  id: string;
  document_id: string;
  client_id: string;
  delivery_method: string;
  delivery_status: string;
  sent_at?: string;
  acknowledged_at?: string;
}

export class ComplianceApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ComplianceApiError';
  }
}

// ============================================================================
// HELPER
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchComplianceApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ComplianceApiError(response.status, error.detail || 'Request failed');
  }

  // Handle HTML responses (for document preview)
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/html')) {
    return (await response.text()) as unknown as T;
  }

  return response.json();
}

// ============================================================================
// ADV PART 2B DATA
// ============================================================================

export async function getADV2BData(advisorId: string): Promise<ADVPart2BData> {
  return fetchComplianceApi<ADVPart2BData>(`/api/v1/compliance/documents/adv-2b-data/${advisorId}`);
}

export async function saveADV2BData(advisorId: string, data: Partial<ADVPart2BData>): Promise<{ id: string; message: string }> {
  return fetchComplianceApi(`/api/v1/compliance/documents/adv-2b-data/${advisorId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// FORM CRS DATA
// ============================================================================

export async function getFormCRSData(): Promise<FormCRSData> {
  return fetchComplianceApi<FormCRSData>('/api/v1/compliance/documents/form-crs-data');
}

export async function saveFormCRSData(data: Partial<FormCRSData>): Promise<{ id: string; message: string }> {
  return fetchComplianceApi('/api/v1/compliance/documents/form-crs-data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// DOCUMENT GENERATION
// ============================================================================

export async function generateADV2B(advisorId: string, regenerate = false): Promise<DocumentVersion> {
  return fetchComplianceApi<DocumentVersion>(`/api/v1/compliance/documents/generate/adv-2b/${advisorId}`, {
    method: 'POST',
    body: JSON.stringify({ regenerate }),
  });
}

export async function generateFormCRS(regenerate = false): Promise<DocumentVersion> {
  return fetchComplianceApi<DocumentVersion>('/api/v1/compliance/documents/generate/form-crs', {
    method: 'POST',
    body: JSON.stringify({ regenerate }),
  });
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export async function listDocuments(documentType?: string): Promise<ComplianceDocument[]> {
  const params = documentType ? `?document_type=${documentType}` : '';
  return fetchComplianceApi<ComplianceDocument[]>(`/api/v1/compliance/documents${params}`);
}

export async function getDocument(documentId: string): Promise<ComplianceDocument> {
  return fetchComplianceApi<ComplianceDocument>(`/api/v1/compliance/documents/${documentId}`);
}

export async function listVersions(documentId: string): Promise<DocumentVersion[]> {
  return fetchComplianceApi<DocumentVersion[]>(`/api/v1/compliance/documents/${documentId}/versions`);
}

export async function getVersionHtml(versionId: string): Promise<string> {
  return fetchComplianceApi<string>(`/api/v1/compliance/documents/versions/${versionId}/html`);
}

export async function getVersionJson(versionId: string): Promise<Record<string, unknown>> {
  return fetchComplianceApi<Record<string, unknown>>(`/api/v1/compliance/documents/versions/${versionId}/json`);
}

// ============================================================================
// REVIEW WORKFLOW
// ============================================================================

export async function approveVersion(versionId: string, reviewNotes?: string): Promise<DocumentVersion> {
  return fetchComplianceApi<DocumentVersion>(`/api/v1/compliance/documents/versions/${versionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ review_notes: reviewNotes }),
  });
}

export async function publishVersion(versionId: string): Promise<DocumentVersion> {
  return fetchComplianceApi<DocumentVersion>(`/api/v1/compliance/documents/versions/${versionId}/publish`, {
    method: 'POST',
  });
}

export async function archiveDocument(documentId: string): Promise<{ id: string; status: string }> {
  return fetchComplianceApi(`/api/v1/compliance/documents/${documentId}/archive`, {
    method: 'POST',
  });
}

// ============================================================================
// DELIVERY
// ============================================================================

export async function deliverDocument(
  documentId: string,
  clientIds: string[],
  method = 'email',
  acknowledgmentRequired = true
): Promise<DocumentDelivery[]> {
  return fetchComplianceApi<DocumentDelivery[]>(`/api/v1/compliance/documents/${documentId}/deliver`, {
    method: 'POST',
    body: JSON.stringify({
      client_ids: clientIds,
      delivery_method: method,
      acknowledgment_required: acknowledgmentRequired,
    }),
  });
}

export async function listDeliveries(documentId: string): Promise<DocumentDelivery[]> {
  return fetchComplianceApi<DocumentDelivery[]>(`/api/v1/compliance/documents/${documentId}/deliveries`);
}

// ============================================================================
// COMPLIANCE CO-PILOT — Dashboard, Alerts, Tasks, Audit
// ============================================================================

export interface ComplianceDashboardMetrics {
  compliance_score: number;
  alerts: {
    total: number;
    open: number;
    under_review: number;
    escalated: number;
    resolved: number;
    by_severity: { critical: number; high: number; medium: number; low: number };
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  pending_reviews: number;
}

export interface ComplianceAlert {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'under_review' | 'escalated' | 'resolved' | 'false_positive';
  client_name?: string;
  ai_analysis?: { recommendation: string; confidence: number } | null;
  due_date?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  comments?: ComplianceAlertComment[];
}

export interface ComplianceAlertComment {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface ComplianceTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_to_name?: string;
  due_date: string;
  completed_at?: string;
  created_at: string;
}

export interface ComplianceAuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────

export async function getDashboardMetrics(): Promise<ComplianceDashboardMetrics> {
  return fetchComplianceApi<ComplianceDashboardMetrics>('/api/v1/compliance/dashboard');
}

// ─── Alerts ──────────────────────────────────────────────────────────────

export async function getAlerts(params?: {
  status?: string;
  severity?: string;
}): Promise<ComplianceAlert[]> {
  const query = params ? new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString() : '';
  return fetchComplianceApi<ComplianceAlert[]>(`/api/v1/compliance/alerts${query ? `?${query}` : ''}`);
}

export async function getAlert(alertId: string): Promise<ComplianceAlert> {
  return fetchComplianceApi<ComplianceAlert>(`/api/v1/compliance/alerts/${alertId}`);
}

export async function updateAlertStatus(
  alertId: string,
  data: { status: string; resolution_notes?: string }
): Promise<ComplianceAlert> {
  return fetchComplianceApi<ComplianceAlert>(`/api/v1/compliance/alerts/${alertId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function addAlertComment(
  alertId: string,
  content: string
): Promise<ComplianceAlertComment> {
  return fetchComplianceApi<ComplianceAlertComment>(`/api/v1/compliance/alerts/${alertId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ─── Tasks ───────────────────────────────────────────────────────────────

export async function getTasks(params?: {
  status?: string;
  include_completed?: boolean;
}): Promise<ComplianceTask[]> {
  const query = params ? new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  ).toString() : '';
  return fetchComplianceApi<ComplianceTask[]>(`/api/v1/compliance/tasks${query ? `?${query}` : ''}`);
}

export async function createTask(data: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  due_date?: string;
}): Promise<ComplianceTask> {
  return fetchComplianceApi<ComplianceTask>('/api/v1/compliance/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeTask(taskId: string): Promise<ComplianceTask> {
  return fetchComplianceApi<ComplianceTask>(`/api/v1/compliance/tasks/${taskId}/complete`, {
    method: 'POST',
  });
}

// ─── Audit Log ───────────────────────────────────────────────────────────

export async function getAuditLogs(): Promise<ComplianceAuditLogEntry[]> {
  return fetchComplianceApi<ComplianceAuditLogEntry[]>('/api/v1/compliance/audit-trail');
}
