/**
 * Client Portal API service.
 * Handles all portal-specific API calls with separate auth from advisor dashboard.
 */

// Get API base URL with HTTPS safeguard for Railway
function getApiBase(): string {
  let url = import.meta.env.VITE_API_URL || '';
  
  // Fix: Sometimes env var gets set incorrectly with "VITE_API_URL=" prefix
  if (url.includes('VITE_API_URL=')) {
    url = url.replace(/.*VITE_API_URL=/i, '');
  }
  
  // Ensure HTTPS for railway.app URLs
  if (url.includes('railway.app') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }
  
  return url;
}

const API_BASE = getApiBase();
const PORTAL_API_URL = `${API_BASE}/api/v1/portal`;

// Storage keys for portal auth (separate from main app)
const PORTAL_TOKEN_KEY = 'portal_token';
const PORTAL_REFRESH_TOKEN_KEY = 'portal_refresh_token';
const PORTAL_CLIENT_NAME_KEY = 'portal_client_name';
const PORTAL_FIRM_NAME_KEY = 'portal_firm_name';

// ============================================================================
// TYPES
// ============================================================================

export interface PortalLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  client_name: string;
  firm_name?: string;
}

export interface AccountSummary {
  id: string;
  account_name: string;
  account_type: string;
  custodian?: string;
  current_value: number;
  tax_type: string;
}

export interface DashboardData {
  client_name: string;
  advisor_name?: string;
  firm_name?: string;
  total_value: number;
  ytd_return: number;
  ytd_return_dollar: number;
  accounts: AccountSummary[];
  pending_nudges: number;
  unread_narratives: number;
  active_goals: number;
  last_updated: string;
}

export interface Goal {
  id: string;
  goal_type: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution?: number;
  progress_pct: number;
  on_track: boolean;
  notes?: string;
  created_at: string;
}

export interface GoalCreateRequest {
  goal_type: string;
  name: string;
  target_amount: number;
  target_date: string;
  monthly_contribution?: number;
  notes?: string;
}

export interface GoalUpdateRequest {
  name?: string;
  target_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  current_amount?: number;
  notes?: string;
}

export interface Nudge {
  id: string;
  nudge_type: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  priority: number;
  status: string;
  created_at: string;
}

export interface Narrative {
  id: string;
  narrative_type: string;
  title: string;
  content: string;
  content_html?: string;
  period_start: string;
  period_end: string;
  is_read: boolean;
  created_at: string;
}

export interface PortalDocument {
  id: string;
  document_type: string;
  title: string;
  period?: string;
  file_size?: number;
  is_read: boolean;
  created_at: string;
}

export interface BrandingConfig {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  portal_title?: string;
  footer_text?: string;
  disclaimer_text?: string;
}

export interface Preferences {
  email_narratives: boolean;
  email_nudges: boolean;
  email_documents: boolean;
}

export interface PreferencesUpdate {
  email_narratives?: boolean;
  email_nudges?: boolean;
  email_documents?: boolean;
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class PortalApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PortalApiError';
  }
}

// ============================================================================
// BASE FETCH FUNCTION
// ============================================================================

async function portalFetch<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = true } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (requireAuth) {
    const token = localStorage.getItem(PORTAL_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(`${PORTAL_API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    // Handle 401 - clear tokens and redirect
    if (response.status === 401) {
      localStorage.removeItem(PORTAL_TOKEN_KEY);
      localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY);
      localStorage.removeItem(PORTAL_CLIENT_NAME_KEY);
      localStorage.removeItem(PORTAL_FIRM_NAME_KEY);
      
      // Only redirect if we're in a portal route
      if (window.location.pathname.startsWith('/portal')) {
        window.location.href = '/portal/login';
      }
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new PortalApiError(
      response.status,
      errorData.detail || response.statusText
    );
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function portalLogin(
  email: string,
  password: string
): Promise<PortalLoginResponse> {
  const response = await portalFetch<PortalLoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    requireAuth: false,
  });
  
  // Store tokens and user info
  localStorage.setItem(PORTAL_TOKEN_KEY, response.access_token);
  localStorage.setItem(PORTAL_REFRESH_TOKEN_KEY, response.refresh_token);
  localStorage.setItem(PORTAL_CLIENT_NAME_KEY, response.client_name);
  if (response.firm_name) {
    localStorage.setItem(PORTAL_FIRM_NAME_KEY, response.firm_name);
  }
  
  return response;
}

export async function portalRefreshToken(): Promise<PortalLoginResponse> {
  const refreshToken = localStorage.getItem(PORTAL_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new PortalApiError(401, 'No refresh token');
  }
  
  const response = await portalFetch<PortalLoginResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    requireAuth: false,
  });
  
  // Update stored tokens
  localStorage.setItem(PORTAL_TOKEN_KEY, response.access_token);
  localStorage.setItem(PORTAL_REFRESH_TOKEN_KEY, response.refresh_token);
  
  return response;
}

export async function portalLogout(): Promise<void> {
  try {
    await portalFetch('/auth/logout', { method: 'POST' });
  } finally {
    // Clear all portal data regardless of API response
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY);
    localStorage.removeItem(PORTAL_CLIENT_NAME_KEY);
    localStorage.removeItem(PORTAL_FIRM_NAME_KEY);
  }
}

export function isPortalAuthenticated(): boolean {
  return !!localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function getPortalClientName(): string | null {
  return localStorage.getItem(PORTAL_CLIENT_NAME_KEY);
}

export function getPortalFirmName(): string | null {
  return localStorage.getItem(PORTAL_FIRM_NAME_KEY);
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function getDashboard(): Promise<DashboardData> {
  return portalFetch<DashboardData>('/dashboard');
}

// ============================================================================
// GOALS
// ============================================================================

export async function getGoals(): Promise<Goal[]> {
  return portalFetch<Goal[]>('/goals');
}

export async function createGoal(data: GoalCreateRequest): Promise<Goal> {
  return portalFetch<Goal>('/goals', {
    method: 'POST',
    body: data,
  });
}

export async function updateGoal(
  id: string,
  data: GoalUpdateRequest
): Promise<Goal> {
  return portalFetch<Goal>(`/goals/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await portalFetch(`/goals/${id}`, { method: 'DELETE' });
}

// ============================================================================
// NUDGES
// ============================================================================

export async function getNudges(): Promise<Nudge[]> {
  return portalFetch<Nudge[]>('/nudges');
}

export async function viewNudge(id: string): Promise<void> {
  await portalFetch(`/nudges/${id}/view`, { method: 'POST' });
}

export async function actOnNudge(id: string): Promise<void> {
  await portalFetch(`/nudges/${id}/act`, { method: 'POST' });
}

export async function dismissNudge(id: string): Promise<void> {
  await portalFetch(`/nudges/${id}/dismiss`, { method: 'POST' });
}

// ============================================================================
// NARRATIVES
// ============================================================================

export async function getNarratives(limit: number = 10): Promise<Narrative[]> {
  return portalFetch<Narrative[]>(`/narratives?limit=${limit}`);
}

export async function markNarrativeRead(id: string): Promise<void> {
  await portalFetch(`/narratives/${id}/read`, { method: 'POST' });
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function getDocuments(
  documentType?: string,
  limit: number = 20
): Promise<PortalDocument[]> {
  let url = `/documents?limit=${limit}`;
  if (documentType) {
    url += `&document_type=${encodeURIComponent(documentType)}`;
  }
  return portalFetch<PortalDocument[]>(url);
}

export async function markDocumentRead(id: string): Promise<void> {
  await portalFetch(`/documents/${id}/read`, { method: 'POST' });
}

// ============================================================================
// BRANDING & PREFERENCES
// ============================================================================

export async function getBranding(): Promise<BrandingConfig> {
  return portalFetch<BrandingConfig>('/config/branding');
}

export async function getPreferences(): Promise<Preferences> {
  return portalFetch<Preferences>('/preferences');
}

export async function updatePreferences(
  data: PreferencesUpdate
): Promise<Preferences> {
  return portalFetch<Preferences>('/preferences', {
    method: 'PATCH',
    body: data,
  });
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export async function getPerformance(): Promise<any> {
  return portalFetch<any>('/performance');
}

// ============================================================================
// MEETINGS
// ============================================================================

export async function getMeetings(): Promise<any> {
  return portalFetch<any>('/meetings');
}

export async function getMeetingAvailability(): Promise<any> {
  return portalFetch<any>('/meetings/availability');
}

export async function scheduleMeeting(data: {
  meeting_type: string;
  datetime: string;
  notes?: string;
}): Promise<any> {
  return portalFetch<any>('/meetings', { method: 'POST', body: data });
}

export async function cancelMeeting(id: string): Promise<any> {
  return portalFetch<any>(`/meetings/${id}`, { method: 'DELETE' });
}

// ============================================================================
// REQUESTS
// ============================================================================

export async function getRequestTypes(): Promise<any> {
  return portalFetch<any>('/requests/types');
}

export async function getRequests(): Promise<any> {
  return portalFetch<any>('/requests');
}

export async function submitRequest(data: {
  type: string;
  details?: Record<string, any>;
  notes?: string;
}): Promise<any> {
  return portalFetch<any>('/requests', { method: 'POST', body: data });
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(): Promise<any> {
  return portalFetch<any>('/notifications');
}

export async function markNotificationRead(id: string): Promise<any> {
  return portalFetch<any>(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<any> {
  return portalFetch<any>('/notifications/read-all', { method: 'POST' });
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const portalApi = {
  // Auth
  login: portalLogin,
  refreshToken: portalRefreshToken,
  logout: portalLogout,
  isAuthenticated: isPortalAuthenticated,
  getClientName: getPortalClientName,
  getFirmName: getPortalFirmName,
  
  // Dashboard
  getDashboard,
  
  // Goals
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  
  // Nudges
  getNudges,
  viewNudge,
  actOnNudge,
  dismissNudge,
  
  // Narratives
  getNarratives,
  markNarrativeRead,
  
  // Documents
  getDocuments,
  markDocumentRead,
  
  // Config
  getBranding,
  getPreferences,
  updatePreferences,

  // Performance
  getPerformance,

  // Meetings
  getMeetings,
  getMeetingAvailability,
  scheduleMeeting,
  cancelMeeting,

  // Requests
  getRequestTypes,
  getRequests,
  submitRequest,

  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

export default portalApi;
