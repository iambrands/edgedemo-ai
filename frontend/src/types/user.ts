export interface User {
  id: number;
  username: string;
  email: string;
  default_strategy: 'income' | 'growth' | 'balanced';
  risk_tolerance: 'low' | 'moderate' | 'high';
  notification_enabled: boolean;
  trading_mode?: 'paper' | 'live';
  paper_balance?: number;
  timezone?: string;  // IANA timezone name (e.g., 'America/Chicago')
  created_at: string;
  risk_acknowledged?: boolean;
  risk_acknowledged_at?: string | null;
  terms_accepted_at?: string | null;
}

export interface AuthResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
}

