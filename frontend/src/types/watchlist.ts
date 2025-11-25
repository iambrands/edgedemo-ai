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
  has_options_signals: boolean;
  last_updated?: string;
  created_at: string;
}

export interface WatchlistResponse {
  watchlist: Stock[];
  count: number;
}

