const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const detail = errBody.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : typeof detail === 'string'
          ? detail
          : errBody.message || `HTTP ${response.status}`;
      throw new Error(msg || `HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const getDashboardSummary = () => fetchAPI('/api/v1/dashboard/summary');
export const getPerformanceData = (period = '1M') =>
  fetchAPI(`/api/v1/dashboard/performance?period=${period}`);

export const getHouseholds = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/households${query ? `?${query}` : ''}`);
};
export const getHousehold = (id) => fetchAPI(`/api/v1/households/${id}`);

export const getAccounts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/accounts${query ? `?${query}` : ''}`);
};
export const getAccount = (id) => fetchAPI(`/api/v1/accounts/${id}`);

export const uploadStatement = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/parse-file`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
  return response.json();
};

export const getTaxOptimization = (householdId) =>
  fetchAPI(`/api/v1/analysis/tax/${householdId}`);
export const getRiskAnalysis = (householdId) =>
  fetchAPI(`/api/v1/analysis/risk-report/${householdId}`);
export const getFeeAnalysis = (accountId) =>
  fetchAPI(`/api/v1/analysis/fees/${accountId}`);
export const getRebalancingPlan = (accountId) =>
  fetchAPI(`/api/v1/analysis/rebalance/${accountId}`, { method: 'POST' });
export const analyzeHousehold = (householdId) =>
  fetchAPI(`/api/v1/analysis/household/${householdId}`, { method: 'POST' });

export const scoreQuestionnaire = (data) =>
  fetchAPI('/api/v1/portfolio-builder/score-questionnaire', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const buildPortfolio = (data) =>
  fetchAPI('/api/v1/portfolio-builder/build-portfolio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const getPresetPortfolios = () => fetchAPI('/api/v1/portfolio-builder/presets');
export const getETFUniverse = () => fetchAPI('/api/v1/portfolio-builder/etf-universe');

export const generateIPS = (data) =>
  fetchAPI('/api/v1/ips/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getComplianceDashboard = () => fetchAPI('/api/v1/compliance/dashboard');
export const getAuditTrail = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/compliance/audit-trail${query ? `?${query}` : ''}`);
};

export const sendChatMessage = (message, context = {}) =>
  fetchAPI('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      client_id: context.client_id || 'default',
      query: message,
      behavioral_profile: context.behavioral_profile || 'balanced',
    }),
  });

export const checkHealth = () => fetchAPI('/api/health');

// Reports
export const getReportTypes = () => fetchAPI('/api/v1/reports/types');
export const generateReport = (data) =>
  fetchAPI('/api/v1/reports/generate', { method: 'POST', body: JSON.stringify(data) });
export const getReportHistory = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/reports/history${q ? `?${q}` : ''}`);
};
export const getScheduledReports = () => fetchAPI('/api/v1/reports/scheduled');

// Client Portal
export const getClientPortalSummary = (clientId) =>
  fetchAPI(`/api/v1/portal/summary/${clientId}`);

// Financial Planning
export const projectRetirement = (data) =>
  fetchAPI('/api/v1/planning/financial/retirement-projection', { method: 'POST', body: JSON.stringify(data) });
export const analyzeGoals = (goals) =>
  fetchAPI('/api/v1/planning/financial/goals', { method: 'POST', body: JSON.stringify(goals) });
export const analyzeCashflow = (params) => {
  const q = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/planning/financial/cashflow?${q}`, { method: 'POST', body: '{}' });
};

// Onboarding
export const startOnboarding = () =>
  fetchAPI('/api/v1/onboarding/start', { method: 'POST' });
export const saveOnboardingStep = (sessionId, stepNumber, data) =>
  fetchAPI(`/api/v1/onboarding/${sessionId}/step/${stepNumber}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const getOnboardingSession = (sessionId) =>
  fetchAPI(`/api/v1/onboarding/${sessionId}`);
export const listActiveOnboardingSessions = () =>
  fetchAPI('/api/v1/onboarding/active/list');

// Billing
export const getFeeSchedules = () => fetchAPI('/api/v1/billing/fee-schedules');
export const calculateFees = (householdId, quarter) =>
  fetchAPI(`/api/v1/billing/calculate/${householdId}?quarter=${encodeURIComponent(quarter || 'Q1 2026')}`);
export const getInvoices = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchAPI(`/api/v1/billing/invoices${q ? `?${q}` : ''}`);
};
export const getRevenueSummary = () => fetchAPI('/api/v1/billing/revenue-summary');

export const analyzePortfolio = (payload) =>
  fetchAPI('/api/analyze-portfolio', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
