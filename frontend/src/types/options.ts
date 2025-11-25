export interface GreeksExplanation {
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
  implied_volatility: string;
}

export interface TradeAnalysis {
  overview: string;
  best_case: string;
  worst_case: string;
  break_even: string;
  profit_potential: string;
  time_considerations: string;
}

export interface RiskAssessment {
  overall_risk_level: 'low' | 'moderate' | 'high';
  risk_factors: string[];
  risk_score: number;
  warnings: string[];
}

export interface Recommendation {
  action: 'buy' | 'consider' | 'consider_carefully' | 'avoid';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suitability: string;
}

export interface AIAnalysis {
  greeks_explanation: GreeksExplanation;
  trade_analysis: TradeAnalysis;
  risk_assessment: RiskAssessment;
  recommendation: Recommendation;
  ai_generated_at: string;
}

export interface OptionContract {
  option_symbol: string;
  description: string;
  contract_type: 'call' | 'put';
  strike: number;
  expiration_date: string;
  last_price: number;
  bid: number;
  ask: number;
  mid_price: number;
  spread?: number;
  spread_percent: number;
  volume: number;
  open_interest: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  implied_volatility: number;
  days_to_expiration: number;
  score: number;
  category: 'Conservative' | 'Balanced' | 'Aggressive';
  explanation: string;
  stock_price: number;
  ai_analysis?: AIAnalysis;
}

export interface OptionsAnalysis {
  symbol: string;
  expiration: string;
  preference: 'income' | 'growth' | 'balanced';
  options: OptionContract[];
  count: number;
}

export interface Expiration {
  symbol: string;
  expirations: string[];
}

