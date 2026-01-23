export interface IVRankData {
  iv_rank: number | null;
  category: 'low' | 'medium' | 'high';
  color: 'green' | 'yellow' | 'red';
  label: string;
  strategy_hint: string;
  current_iv: number | null;
}

export interface EarningsData {
  symbol: string;
  earnings_date: string;
  earnings_time: string;
  days_until: number;
  is_this_week: boolean;
}

export interface Stock {
  id: number;
  symbol: string;
  company_name?: string;
  current_price?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;
  tags: string[];
  notes?: string;
  implied_volatility?: number;
  iv_rank?: number;
  iv_rank_data?: IVRankData;
  earnings?: EarningsData;
  has_options_signals: boolean;
  last_updated?: string;
  created_at: string;
}

export interface WatchlistResponse {
  watchlist: Stock[];
  count: number;
}

