export interface Trade {
  id: number;
  symbol: string;
  option_symbol?: string;
  contract_type?: 'call' | 'put';
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  strike_price?: number;
  expiration_date?: string;
  trade_date: string;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  implied_volatility?: number;
  strategy_source: 'manual' | 'automation' | 'signal';
  automation_id?: number;
  notes?: string;
  realized_pnl?: number;
  realized_pnl_percent?: number;
  commission: number;
  entry_trade_id?: number;
  exit_trade_id?: number;
}

export interface Position {
  id: number | string;  // Can be number for positions or "spread_X" for spreads
  symbol: string;
  option_symbol?: string;
  contract_type?: 'call' | 'put';
  quantity: number;
  entry_price: number;
  current_price: number | null;
  strike_price?: number;
  expiration_date?: string;
  entry_date: string;
  entry_delta?: number;
  entry_gamma?: number;
  entry_theta?: number;
  entry_vega?: number;
  entry_iv?: number;
  current_delta?: number;
  current_gamma?: number;
  current_theta?: number;
  current_vega?: number;
  current_iv?: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  automation_id?: number;
  status: 'open' | 'closed' | 'pending_exit';
  last_updated: string;
  // Spread-specific fields
  is_spread?: boolean;
  spread_id?: number;
  spread_type?: string;
  long_strike?: number;
  short_strike?: number;
  strike_width?: number;
  net_debit?: number;
  max_profit?: number;
  max_loss?: number;
  breakeven?: number;
}

