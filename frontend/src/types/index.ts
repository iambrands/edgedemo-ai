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

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'ria';
  firm?: string;
  crd?: string;
  state?: string;
  licenses?: string;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

export interface Household {
  id: string;
  name: string;
  members: string[];
  totalValue: number;
  accounts: number;
  riskScore: number;
  lastAnalysis: string;
  status: 'attention' | 'good' | 'rebalance';
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
  status: 'good' | 'high-fee' | 'concentrated' | 'rebalance';
}

export interface Alert {
  id: number;
  type: 'concentration' | 'fee' | 'rebalance' | 'compliance';
  severity: 'high' | 'medium' | 'low';
  message: string;
  householdId: string | null;
  date: string;
}

export interface ComplianceLog {
  id: number;
  date: string;
  household: string;
  rule: string;
  result: 'PASS' | 'FAIL' | 'WARNING';
  detail: string;
  promptVersion: string;
}

export interface Activity {
  id: number;
  action: string;
  detail: string;
  date: string;
}
