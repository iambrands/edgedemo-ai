/**
 * API service layer for EdgeAI frontend.
 * Handles all backend communication with auth headers.
 */

// Use environment variable for production, empty string for dev (uses Vite proxy)
// Ensure HTTPS is used for production Railway URLs to prevent mixed content errors
function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL || '';
  // If URL contains railway.app, ensure it uses HTTPS
  if (envUrl.includes('railway.app') && envUrl.startsWith('http://')) {
    return envUrl.replace('http://', 'https://');
  }
  return envUrl;
}

const API_BASE = getApiBase();

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  // Check both storage locations for token (Remember Me support)
  const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }
  
  return response.json();
}

// --- Types ---

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'ria';
  firm?: string;
  licenses?: string[];
  crd?: string;
  state?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DashboardSummary {
  kpis: {
    totalAUM: number;
    householdCount: number;
    accountCount: number;
    alertCount: number;
  };
  households: Array<{
    id: string;
    name: string;
    members: string[];
    totalValue: number;
    accounts: number;
    riskScore: number;
    lastAnalysis: string;
    status: string;
  }>;
  alerts: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    householdId: string | null;
    date: string;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    detail: string;
    date: string;
  }>;
}

export interface Account {
  id: string;
  householdId: string;
  name: string;
  custodian: string;
  type: string;
  taxType: string;
  balance: number;
  fees: string;
  status: string;
}

export interface Household {
  id: string;
  name: string;
  members: string[];
  totalValue: number;
  accounts: Account[];
  riskScore: number;
  lastAnalysis: string;
  status: string;
}

export interface ComplianceLog {
  id: number;
  date: string;
  household: string;
  rule: string;
  result: string;
  detail: string;
  promptVersion: string;
}

export interface ParsedStatement {
  id: string;
  filename: string;
  custodian: string;
  parsed: string;
  confidence: string;
  date: string;
  status: string;
}

export interface ChatResponse {
  response: string;
  pipeline: {
    iim: string;
    cim: string;
    bim: string;
    latency_ms: number;
  };
}

// --- Auth API ---

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  signup: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    firm?: string;
    crd?: string;
    state?: string;
    licenses?: string;
  }) =>
    fetchApi<TokenResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: data,
    }),
  
  getMe: () => fetchApi<User>('/api/v1/auth/me'),
  
  refresh: () => fetchApi<TokenResponse>('/api/v1/auth/refresh', { method: 'POST' }),
};

// --- Dashboard API ---

export const dashboardApi = {
  getSummary: () => fetchApi<DashboardSummary>('/api/v1/ria/dashboard/summary'),
};

// --- Households API ---

export interface CreateHouseholdData {
  name: string;
  members: string[];
  riskTolerance: string;
  investmentObjective: string;
  timeHorizon: string;
}

export const householdsApi = {
  list: () => fetchApi<Household[]>('/api/v1/ria/households'),
  get: (id: string) => fetchApi<Household>(`/api/v1/ria/households/${id}`),
  analyze: (id: string) => fetchApi<{ status: string; message: string }>(`/api/v1/ria/households/${id}/analyze`, { method: 'POST' }),
  create: (data: CreateHouseholdData) => fetchApi<Household>('/api/v1/ria/households', { method: 'POST', body: data }),
};

// --- Accounts API ---

export const accountsApi = {
  list: () => fetchApi<Account[]>('/api/v1/ria/accounts'),
};

// --- Statements API ---

export const statementsApi = {
  list: () => fetchApi<ParsedStatement[]>('/api/v1/ria/statements'),
  
  upload: async (file: File, householdId?: string) => {
    // Check both storage locations for token (Remember Me support)
    const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
    const formData = new FormData();
    formData.append('file', file);
    if (householdId) formData.append('householdId', householdId);
    
    const response = await fetch(`${API_BASE}/api/v1/ria/statements/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(response.status, error.detail || 'Upload failed');
    }
    return response.json();
  },
  
  getParsed: (id: string) => fetchApi<ParsedStatement & { positions: Array<{ ticker: string; quantity: number; value: number; confidence: number }> }>(`/api/v1/ria/statements/${id}/parsed`),
  
  confirm: (id: string) => fetchApi<{ status: string; message: string }>(`/api/v1/ria/statements/${id}/confirm`, { method: 'POST' }),
};

// --- Compliance API ---

export const complianceApi = {
  getAuditTrail: () => fetchApi<ComplianceLog[]>('/api/v1/ria/compliance/audit-trail'),
};

// --- Chat API ---

export const chatApi = {
  sendMessage: (message: string, householdId?: string) =>
    fetchApi<ChatResponse>('/api/v1/ria/chat/message', {
      method: 'POST',
      body: { message, householdId },
    }),
};

// --- Analysis API ---

export interface AnalysisResult {
  householdId: string;
  householdName?: string;
  [key: string]: unknown;
}

export const analysisApi = {
  run: <T = AnalysisResult>(toolType: string, householdId: string) =>
    fetchApi<T>(`/api/v1/analysis/${toolType}/${householdId}`, { method: 'POST' }),
};

// --- Health API ---

export const healthApi = {
  check: () => fetchApi<{ status: string; version: string }>('/api/health'),
};
