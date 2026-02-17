import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  Filter,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Leaf,
  CalendarDays,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TradeTab = 'blotter' | 'rebalancing' | 'tax' | 'history';

type TradeSide = 'Buy' | 'Sell';
type TradeStatus = 'Pending' | 'Approved' | 'Executing' | 'Completed' | 'Rejected';
type OrderType = 'Market' | 'Limit' | 'Stop';

interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  account: string;
  status: TradeStatus;
  timestamp: string;
  orderType: OrderType;
}

type DriftLevel = 'On Target' | 'Drifted' | 'Critical';

interface AssetDrift {
  assetClass: string;
  targetPct: number;
  actualPct: number;
  tradeNeeded: string;
}

interface RebalanceAccount {
  id: string;
  accountName: string;
  modelPortfolio: string;
  driftPct: number;
  status: DriftLevel;
  lastRebalanced: string;
  aum: number;
  assetDrifts: AssetDrift[];
}

interface TaxLossOpportunity {
  id: string;
  security: string;
  unrealizedLoss: number;
  washSaleRisk: boolean;
  estimatedTaxSavings: number;
  substituteSecurity: string;
  costBasis: number;
  currentPrice: number;
  shares: number;
  holdingPeriod: string;
}

interface TaxLot {
  id: string;
  security: string;
  purchaseDate: string;
  shares: number;
  costBasis: number;
  currentValue: number;
  gainLoss: number;
  term: 'Long-Term' | 'Short-Term';
}

interface HistoricalTrade {
  id: string;
  date: string;
  account: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  total: number;
  venue: string;
  status: 'Filled' | 'Partially Filled' | 'Cancelled';
}

// ============================================================================
// HELPERS
// ============================================================================

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);

const fmtCurrencyDecimal = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const fmtNumber = (v: number) =>
  new Intl.NumberFormat('en-US').format(v);

// ============================================================================
// MOCK DATA
// ============================================================================

const ACCOUNTS = [
  'Smith Family Trust',
  'Johnson IRA',
  'Williams 401(k)',
  'Davis Brokerage',
  'Brown Joint Account',
  'Wilson Roth IRA',
  'Taylor Foundation',
  'Anderson Estate',
];

const MOCK_TRADES: Trade[] = [
  { id: 'T001', symbol: 'AAPL', side: 'Buy', quantity: 150, price: 189.45, account: 'Smith Family Trust', status: 'Completed', timestamp: '2026-02-17 09:31:22', orderType: 'Market' },
  { id: 'T002', symbol: 'MSFT', side: 'Buy', quantity: 75, price: 420.80, account: 'Johnson IRA', status: 'Completed', timestamp: '2026-02-17 09:32:15', orderType: 'Limit' },
  { id: 'T003', symbol: 'GOOGL', side: 'Sell', quantity: 30, price: 175.20, account: 'Davis Brokerage', status: 'Executing', timestamp: '2026-02-17 10:15:00', orderType: 'Market' },
  { id: 'T004', symbol: 'AMZN', side: 'Buy', quantity: 50, price: 205.60, account: 'Brown Joint Account', status: 'Pending', timestamp: '2026-02-17 10:22:45', orderType: 'Limit' },
  { id: 'T005', symbol: 'NVDA', side: 'Buy', quantity: 100, price: 875.30, account: 'Williams 401(k)', status: 'Approved', timestamp: '2026-02-17 10:30:10', orderType: 'Market' },
  { id: 'T006', symbol: 'TSLA', side: 'Sell', quantity: 200, price: 178.90, account: 'Smith Family Trust', status: 'Rejected', timestamp: '2026-02-17 10:45:00', orderType: 'Stop' },
  { id: 'T007', symbol: 'META', side: 'Buy', quantity: 60, price: 575.40, account: 'Wilson Roth IRA', status: 'Pending', timestamp: '2026-02-17 11:00:33', orderType: 'Limit' },
  { id: 'T008', symbol: 'BRK.B', side: 'Buy', quantity: 25, price: 450.15, account: 'Taylor Foundation', status: 'Completed', timestamp: '2026-02-17 11:15:20', orderType: 'Market' },
  { id: 'T009', symbol: 'JPM', side: 'Sell', quantity: 120, price: 198.60, account: 'Anderson Estate', status: 'Executing', timestamp: '2026-02-17 11:30:45', orderType: 'Market' },
  { id: 'T010', symbol: 'V', side: 'Buy', quantity: 80, price: 285.70, account: 'Johnson IRA', status: 'Completed', timestamp: '2026-02-17 11:45:12', orderType: 'Limit' },
  { id: 'T011', symbol: 'UNH', side: 'Sell', quantity: 40, price: 520.30, account: 'Davis Brokerage', status: 'Pending', timestamp: '2026-02-17 12:00:00', orderType: 'Stop' },
  { id: 'T012', symbol: 'XOM', side: 'Buy', quantity: 300, price: 108.45, account: 'Brown Joint Account', status: 'Approved', timestamp: '2026-02-17 12:15:30', orderType: 'Market' },
  { id: 'T013', symbol: 'HD', side: 'Sell', quantity: 55, price: 378.90, account: 'Williams 401(k)', status: 'Completed', timestamp: '2026-02-17 12:30:00', orderType: 'Limit' },
];

const MOCK_REBALANCE_ACCOUNTS: RebalanceAccount[] = [
  {
    id: 'RA01', accountName: 'Smith Family Trust', modelPortfolio: 'Balanced Growth', driftPct: 1.2,
    status: 'On Target', lastRebalanced: '2026-02-10', aum: 2450000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 40, actualPct: 40.8, tradeNeeded: 'Sell $19,600' },
      { assetClass: 'Intl Equity', targetPct: 20, actualPct: 19.5, tradeNeeded: 'Buy $12,250' },
      { assetClass: 'Fixed Income', targetPct: 30, actualPct: 29.7, tradeNeeded: 'Buy $7,350' },
      { assetClass: 'Alternatives', targetPct: 5, actualPct: 5.2, tradeNeeded: 'Sell $4,900' },
      { assetClass: 'Cash', targetPct: 5, actualPct: 4.8, tradeNeeded: 'Buy $4,900' },
    ],
  },
  {
    id: 'RA02', accountName: 'Johnson IRA', modelPortfolio: 'Aggressive Growth', driftPct: 3.8,
    status: 'Drifted', lastRebalanced: '2026-01-15', aum: 875000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 55, actualPct: 58.2, tradeNeeded: 'Sell $28,000' },
      { assetClass: 'Intl Equity', targetPct: 25, actualPct: 22.1, tradeNeeded: 'Buy $25,375' },
      { assetClass: 'Fixed Income', targetPct: 10, actualPct: 10.4, tradeNeeded: 'Sell $3,500' },
      { assetClass: 'Alternatives', targetPct: 7, actualPct: 6.5, tradeNeeded: 'Buy $4,375' },
      { assetClass: 'Cash', targetPct: 3, actualPct: 2.8, tradeNeeded: 'Buy $1,750' },
    ],
  },
  {
    id: 'RA03', accountName: 'Williams 401(k)', modelPortfolio: 'Target Date 2040', driftPct: 6.1,
    status: 'Critical', lastRebalanced: '2025-12-01', aum: 520000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 50, actualPct: 56.1, tradeNeeded: 'Sell $31,720' },
      { assetClass: 'Intl Equity', targetPct: 20, actualPct: 17.3, tradeNeeded: 'Buy $14,040' },
      { assetClass: 'Fixed Income', targetPct: 25, actualPct: 22.1, tradeNeeded: 'Buy $15,080' },
      { assetClass: 'Alternatives', targetPct: 0, actualPct: 0, tradeNeeded: 'None' },
      { assetClass: 'Cash', targetPct: 5, actualPct: 4.5, tradeNeeded: 'Buy $2,600' },
    ],
  },
  {
    id: 'RA04', accountName: 'Davis Brokerage', modelPortfolio: 'Income Focus', driftPct: 0.8,
    status: 'On Target', lastRebalanced: '2026-02-14', aum: 1380000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 25, actualPct: 25.3, tradeNeeded: 'Sell $4,140' },
      { assetClass: 'Intl Equity', targetPct: 10, actualPct: 9.8, tradeNeeded: 'Buy $2,760' },
      { assetClass: 'Fixed Income', targetPct: 50, actualPct: 49.7, tradeNeeded: 'Buy $4,140' },
      { assetClass: 'Alternatives', targetPct: 5, actualPct: 5.1, tradeNeeded: 'Sell $1,380' },
      { assetClass: 'Cash', targetPct: 10, actualPct: 10.1, tradeNeeded: 'Sell $1,380' },
    ],
  },
  {
    id: 'RA05', accountName: 'Brown Joint Account', modelPortfolio: 'Balanced Growth', driftPct: 4.5,
    status: 'Drifted', lastRebalanced: '2026-01-02', aum: 960000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 40, actualPct: 43.8, tradeNeeded: 'Sell $36,480' },
      { assetClass: 'Intl Equity', targetPct: 20, actualPct: 17.2, tradeNeeded: 'Buy $26,880' },
      { assetClass: 'Fixed Income', targetPct: 30, actualPct: 29.5, tradeNeeded: 'Buy $4,800' },
      { assetClass: 'Alternatives', targetPct: 5, actualPct: 4.7, tradeNeeded: 'Buy $2,880' },
      { assetClass: 'Cash', targetPct: 5, actualPct: 4.8, tradeNeeded: 'Buy $1,920' },
    ],
  },
  {
    id: 'RA06', accountName: 'Wilson Roth IRA', modelPortfolio: 'Aggressive Growth', driftPct: 2.1,
    status: 'Drifted', lastRebalanced: '2026-02-03', aum: 340000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 55, actualPct: 56.8, tradeNeeded: 'Sell $6,120' },
      { assetClass: 'Intl Equity', targetPct: 25, actualPct: 23.5, tradeNeeded: 'Buy $5,100' },
      { assetClass: 'Fixed Income', targetPct: 10, actualPct: 10.3, tradeNeeded: 'Sell $1,020' },
      { assetClass: 'Alternatives', targetPct: 7, actualPct: 6.8, tradeNeeded: 'Buy $680' },
      { assetClass: 'Cash', targetPct: 3, actualPct: 2.6, tradeNeeded: 'Buy $1,360' },
    ],
  },
  {
    id: 'RA07', accountName: 'Taylor Foundation', modelPortfolio: 'ESG Balanced', driftPct: 7.3,
    status: 'Critical', lastRebalanced: '2025-11-20', aum: 4200000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 35, actualPct: 41.5, tradeNeeded: 'Sell $273,000' },
      { assetClass: 'Intl Equity', targetPct: 20, actualPct: 16.8, tradeNeeded: 'Buy $134,400' },
      { assetClass: 'Fixed Income', targetPct: 30, actualPct: 27.2, tradeNeeded: 'Buy $117,600' },
      { assetClass: 'Alternatives', targetPct: 10, actualPct: 9.5, tradeNeeded: 'Buy $21,000' },
      { assetClass: 'Cash', targetPct: 5, actualPct: 5.0, tradeNeeded: 'None' },
    ],
  },
  {
    id: 'RA08', accountName: 'Anderson Estate', modelPortfolio: 'Conservative Income', driftPct: 1.6,
    status: 'On Target', lastRebalanced: '2026-02-07', aum: 3100000,
    assetDrifts: [
      { assetClass: 'US Equity', targetPct: 20, actualPct: 20.9, tradeNeeded: 'Sell $27,900' },
      { assetClass: 'Intl Equity', targetPct: 10, actualPct: 9.3, tradeNeeded: 'Buy $21,700' },
      { assetClass: 'Fixed Income', targetPct: 55, actualPct: 54.3, tradeNeeded: 'Buy $21,700' },
      { assetClass: 'Alternatives', targetPct: 5, actualPct: 5.2, tradeNeeded: 'Sell $6,200' },
      { assetClass: 'Cash', targetPct: 10, actualPct: 10.3, tradeNeeded: 'Sell $9,300' },
    ],
  },
];

const MOCK_TAX_OPPORTUNITIES: TaxLossOpportunity[] = [
  { id: 'TL01', security: 'INTC', unrealizedLoss: -18420, washSaleRisk: false, estimatedTaxSavings: 6447, substituteSecurity: 'AMD', costBasis: 42.80, currentPrice: 24.38, shares: 1000, holdingPeriod: '8 months' },
  { id: 'TL02', security: 'DIS', unrealizedLoss: -12350, washSaleRisk: false, estimatedTaxSavings: 4323, substituteSecurity: 'CMCSA', costBasis: 118.50, currentPrice: 94.15, shares: 510, holdingPeriod: '14 months' },
  { id: 'TL03', security: 'PYPL', unrealizedLoss: -8900, washSaleRisk: true, estimatedTaxSavings: 3115, substituteSecurity: 'SQ', costBasis: 85.20, currentPrice: 67.30, shares: 500, holdingPeriod: '3 months' },
  { id: 'TL04', security: 'BA', unrealizedLoss: -22100, washSaleRisk: false, estimatedTaxSavings: 7735, substituteSecurity: 'LMT', costBasis: 245.00, currentPrice: 178.95, shares: 335, holdingPeriod: '11 months' },
  { id: 'TL05', security: 'NKE', unrealizedLoss: -6780, washSaleRisk: true, estimatedTaxSavings: 2373, substituteSecurity: 'LULU', costBasis: 102.40, currentPrice: 79.50, shares: 296, holdingPeriod: '5 months' },
  { id: 'TL06', security: 'BABA', unrealizedLoss: -31200, washSaleRisk: false, estimatedTaxSavings: 10920, substituteSecurity: 'JD', costBasis: 128.00, currentPrice: 75.50, shares: 594, holdingPeriod: '18 months' },
  { id: 'TL07', security: 'PFE', unrealizedLoss: -9450, washSaleRisk: false, estimatedTaxSavings: 3308, substituteSecurity: 'MRK', costBasis: 38.90, currentPrice: 26.15, shares: 742, holdingPeriod: '6 months' },
];

const MOCK_TAX_LOTS: TaxLot[] = [
  { id: 'LOT01', security: 'AAPL', purchaseDate: '2024-03-15', shares: 100, costBasis: 17200, currentValue: 18945, gainLoss: 1745, term: 'Long-Term' },
  { id: 'LOT02', security: 'AAPL', purchaseDate: '2025-09-20', shares: 50, costBasis: 11450, currentValue: 9473, gainLoss: -1977, term: 'Short-Term' },
  { id: 'LOT03', security: 'MSFT', purchaseDate: '2024-06-10', shares: 75, costBasis: 28500, currentValue: 31560, gainLoss: 3060, term: 'Long-Term' },
  { id: 'LOT04', security: 'GOOGL', purchaseDate: '2025-11-05', shares: 60, costBasis: 10920, currentValue: 10512, gainLoss: -408, term: 'Short-Term' },
  { id: 'LOT05', security: 'NVDA', purchaseDate: '2024-01-22', shares: 40, costBasis: 19600, currentValue: 35012, gainLoss: 15412, term: 'Long-Term' },
  { id: 'LOT06', security: 'TSLA', purchaseDate: '2025-08-14', shares: 80, costBasis: 19200, currentValue: 14312, gainLoss: -4888, term: 'Short-Term' },
];

const MOCK_HISTORICAL_TRADES: HistoricalTrade[] = [
  { id: 'H001', date: '2026-02-17', account: 'Smith Family Trust', symbol: 'AAPL', side: 'Buy', quantity: 150, price: 189.45, total: 28417.50, venue: 'NYSE', status: 'Filled' },
  { id: 'H002', date: '2026-02-17', account: 'Johnson IRA', symbol: 'MSFT', side: 'Buy', quantity: 75, price: 420.80, total: 31560.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H003', date: '2026-02-16', account: 'Davis Brokerage', symbol: 'GOOGL', side: 'Sell', quantity: 30, price: 174.50, total: 5235.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H004', date: '2026-02-15', account: 'Brown Joint Account', symbol: 'AMZN', side: 'Buy', quantity: 50, price: 203.90, total: 10195.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H005', date: '2026-02-14', account: 'Williams 401(k)', symbol: 'NVDA', side: 'Buy', quantity: 100, price: 870.15, total: 87015.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H006', date: '2026-02-14', account: 'Wilson Roth IRA', symbol: 'META', side: 'Sell', quantity: 45, price: 568.20, total: 25569.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H007', date: '2026-02-13', account: 'Taylor Foundation', symbol: 'BRK.B', side: 'Buy', quantity: 25, price: 448.90, total: 11222.50, venue: 'NYSE', status: 'Filled' },
  { id: 'H008', date: '2026-02-12', account: 'Anderson Estate', symbol: 'JPM', side: 'Sell', quantity: 120, price: 196.40, total: 23568.00, venue: 'NYSE', status: 'Filled' },
  { id: 'H009', date: '2026-02-11', account: 'Smith Family Trust', symbol: 'V', side: 'Buy', quantity: 80, price: 282.30, total: 22584.00, venue: 'NYSE', status: 'Filled' },
  { id: 'H010', date: '2026-02-10', account: 'Johnson IRA', symbol: 'UNH', side: 'Sell', quantity: 35, price: 518.75, total: 18156.25, venue: 'NYSE', status: 'Filled' },
  { id: 'H011', date: '2026-02-07', account: 'Davis Brokerage', symbol: 'XOM', side: 'Buy', quantity: 200, price: 106.80, total: 21360.00, venue: 'NYSE', status: 'Partially Filled' },
  { id: 'H012', date: '2026-02-06', account: 'Brown Joint Account', symbol: 'HD', side: 'Sell', quantity: 55, price: 375.60, total: 20658.00, venue: 'NYSE', status: 'Filled' },
  { id: 'H013', date: '2026-02-05', account: 'Williams 401(k)', symbol: 'PG', side: 'Buy', quantity: 90, price: 168.25, total: 15142.50, venue: 'NYSE', status: 'Filled' },
  { id: 'H014', date: '2026-02-03', account: 'Wilson Roth IRA', symbol: 'COST', side: 'Buy', quantity: 20, price: 912.40, total: 18248.00, venue: 'NASDAQ', status: 'Filled' },
  { id: 'H015', date: '2026-01-31', account: 'Taylor Foundation', symbol: 'ABBV', side: 'Sell', quantity: 110, price: 172.85, total: 19013.50, venue: 'NYSE', status: 'Filled' },
  { id: 'H016', date: '2026-01-28', account: 'Anderson Estate', symbol: 'CRM', side: 'Buy', quantity: 65, price: 310.50, total: 20182.50, venue: 'NYSE', status: 'Filled' },
  { id: 'H017', date: '2026-01-24', account: 'Smith Family Trust', symbol: 'LLY', side: 'Buy', quantity: 15, price: 785.30, total: 11779.50, venue: 'NYSE', status: 'Cancelled' },
  { id: 'H018', date: '2026-01-20', account: 'Johnson IRA', symbol: 'AVGO', side: 'Sell', quantity: 30, price: 1285.60, total: 38568.00, venue: 'NASDAQ', status: 'Filled' },
];

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Filled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-sky-50 text-sky-700 border-sky-200',
    Executing: 'bg-blue-50 text-blue-700 border-blue-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
    'Partially Filled': 'bg-amber-50 text-amber-700 border-amber-200',
    'On Target': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Drifted: 'bg-amber-50 text-amber-700 border-amber-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {status}
    </span>
  );
}

function SideBadge({ side }: { side: TradeSide }) {
  return side === 'Buy' ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm">
      <ArrowUp className="w-3.5 h-3.5" /> Buy
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
      <ArrowDown className="w-3.5 h-3.5" /> Sell
    </span>
  );
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'blue',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
}) {
  const iconColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 1: TRADE BLOTTER
// ============================================================================

function TradeBlotter() {
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({
    account: ACCOUNTS[0],
    symbol: '',
    side: 'Buy' as TradeSide,
    quantity: '',
    orderType: 'Market' as OrderType,
    price: '',
  });

  const totalOrders = trades.length;
  const pendingApproval = trades.filter((t) => t.status === 'Pending' || t.status === 'Approved').length;
  const executedValue = trades
    .filter((t) => t.status === 'Completed')
    .reduce((sum, t) => sum + t.quantity * t.price, 0);
  const failedRejected = trades.filter((t) => t.status === 'Rejected').length;

  const handleSubmitTrade = () => {
    if (!newTrade.symbol || !newTrade.quantity) return;
    const trade: Trade = {
      id: `T${String(trades.length + 1).padStart(3, '0')}`,
      symbol: newTrade.symbol.toUpperCase(),
      side: newTrade.side,
      quantity: parseInt(newTrade.quantity) || 0,
      price: parseFloat(newTrade.price) || 0,
      account: newTrade.account,
      status: 'Pending',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      orderType: newTrade.orderType,
    };
    setTrades([trade, ...trades]);
    setShowNewTrade(false);
    setNewTrade({ account: ACCOUNTS[0], symbol: '', side: 'Buy', quantity: '', orderType: 'Market', price: '' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={BarChart3} label="Total Orders Today" value={String(totalOrders)} sublabel="Across all accounts" color="blue" />
        <SummaryCard icon={Clock} label="Pending Approval" value={String(pendingApproval)} sublabel="Awaiting review" color="amber" />
        <SummaryCard icon={DollarSign} label="Executed Value" value={fmtCurrency(executedValue)} sublabel="Completed trades" color="emerald" />
        <SummaryCard icon={AlertTriangle} label="Failed / Rejected" value={String(failedRejected)} sublabel="Requires attention" color="red" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Trade Blotter</h3>
          <button
            onClick={() => setShowNewTrade(!showNewTrade)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showNewTrade ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showNewTrade ? 'Cancel' : 'New Trade'}
          </button>
        </div>

        {showNewTrade && (
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Account</label>
                <select
                  value={newTrade.account}
                  onChange={(e) => setNewTrade({ ...newTrade, account: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ACCOUNTS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Symbol</label>
                <input
                  type="text"
                  value={newTrade.symbol}
                  onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value })}
                  placeholder="e.g. AAPL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Side</label>
                <select
                  value={newTrade.side}
                  onChange={(e) => setNewTrade({ ...newTrade, side: e.target.value as TradeSide })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  value={newTrade.quantity}
                  onChange={(e) => setNewTrade({ ...newTrade, quantity: e.target.value })}
                  placeholder="100"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order Type</label>
                <select
                  value={newTrade.orderType}
                  onChange={(e) => setNewTrade({ ...newTrade, orderType: e.target.value as OrderType })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Market">Market</option>
                  <option value="Limit">Limit</option>
                  <option value="Stop">Stop</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSubmitTrade}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Submit Order
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Symbol</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-slate-600">{t.id}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{t.symbol}</td>
                  <td className="px-5 py-3"><SideBadge side={t.side} /></td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtNumber(t.quantity)}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtCurrencyDecimal(t.price)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 max-w-[160px] truncate">{t.account}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{t.orderType}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3 text-sm text-slate-400 font-mono whitespace-nowrap">{t.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: REBALANCING
// ============================================================================

function Rebalancing() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === MOCK_REBALANCE_ACCOUNTS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(MOCK_REBALANCE_ACCOUNTS.map((a) => a.id)));
    }
  };

  const driftedCount = MOCK_REBALANCE_ACCOUNTS.filter((a) => a.status === 'Drifted' || a.status === 'Critical').length;
  const criticalCount = MOCK_REBALANCE_ACCOUNTS.filter((a) => a.status === 'Critical').length;
  const totalAum = MOCK_REBALANCE_ACCOUNTS.reduce((s, a) => s + a.aum, 0);
  const avgDrift = MOCK_REBALANCE_ACCOUNTS.reduce((s, a) => s + a.driftPct, 0) / MOCK_REBALANCE_ACCOUNTS.length;

  const driftBarColor = (pct: number) => {
    if (pct < 2) return 'bg-emerald-500';
    if (pct < 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={BarChart3} label="Total Accounts" value={String(MOCK_REBALANCE_ACCOUNTS.length)} sublabel={`${fmtCurrency(totalAum)} total AUM`} color="blue" />
        <SummaryCard icon={Percent} label="Average Drift" value={`${avgDrift.toFixed(1)}%`} sublabel="Across all accounts" color="amber" />
        <SummaryCard icon={AlertTriangle} label="Accounts Drifted" value={String(driftedCount)} sublabel={`${criticalCount} critical`} color="red" />
        <SummaryCard icon={CheckCircle} label="On Target" value={String(MOCK_REBALANCE_ACCOUNTS.length - driftedCount)} sublabel="Within tolerance" color="emerald" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Portfolio Rebalancing</h3>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected.size > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            disabled={selected.size === 0}
          >
            <RefreshCw className="w-4 h-4" />
            Rebalance Selected ({selected.size})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === MOCK_REBALANCE_ACCOUNTS.length}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">AUM</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Drift</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Rebalanced</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_REBALANCE_ACCOUNTS.map((acct) => (
                <React.Fragment key={acct.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(acct.id)}
                        onChange={() => toggleSelect(acct.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">{acct.accountName}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{acct.modelPortfolio}</td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtCurrency(acct.aum)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${driftBarColor(acct.driftPct)}`}
                            style={{ width: `${Math.min(acct.driftPct * 10, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-slate-700 w-12 text-right">{acct.driftPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={acct.status} /></td>
                    <td className="px-5 py-3 text-sm text-slate-500">{acct.lastRebalanced}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setExpandedRow(expandedRow === acct.id ? null : acct.id)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {expandedRow === acct.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === acct.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 px-5 py-4">
                        <div className="ml-10">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Per-Asset-Class Drift Detail</p>
                          <div className="grid gap-2">
                            {acct.assetDrifts.map((ad) => {
                              const diff = ad.actualPct - ad.targetPct;
                              return (
                                <div key={ad.assetClass} className="flex items-center gap-4 text-sm">
                                  <span className="w-28 text-slate-700 font-medium">{ad.assetClass}</span>
                                  <span className="w-20 text-slate-500 text-right">Target: {ad.targetPct}%</span>
                                  <span className="w-20 text-slate-500 text-right">Actual: {ad.actualPct}%</span>
                                  <span className={`w-16 text-right font-mono ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                  </span>
                                  <span className="text-slate-500">{ad.tradeNeeded}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: TAX-INTELLIGENT TRADING
// ============================================================================

function TaxIntelligent() {
  const totalUnrealizedLosses = MOCK_TAX_OPPORTUNITIES.reduce((s, o) => s + o.unrealizedLoss, 0);
  const totalEstimatedSavings = MOCK_TAX_OPPORTUNITIES.reduce((s, o) => s + o.estimatedTaxSavings, 0);
  const washSaleRisks = MOCK_TAX_OPPORTUNITIES.filter((o) => o.washSaleRisk).length;
  const lotsAvailable = MOCK_TAX_LOTS.length;

  const longTermGains = MOCK_TAX_LOTS.filter((l) => l.term === 'Long-Term' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0);
  const shortTermGains = MOCK_TAX_LOTS.filter((l) => l.term === 'Short-Term' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0);
  const longTermLosses = MOCK_TAX_LOTS.filter((l) => l.term === 'Long-Term' && l.gainLoss < 0).reduce((s, l) => s + l.gainLoss, 0);
  const shortTermLosses = MOCK_TAX_LOTS.filter((l) => l.term === 'Short-Term' && l.gainLoss < 0).reduce((s, l) => s + l.gainLoss, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingDown} label="Total Unrealized Losses" value={fmtCurrency(Math.abs(totalUnrealizedLosses))} sublabel={`${MOCK_TAX_OPPORTUNITIES.length} opportunities`} color="red" />
        <SummaryCard icon={DollarSign} label="Estimated Tax Savings" value={fmtCurrency(totalEstimatedSavings)} sublabel="At 35% marginal rate" color="emerald" />
        <SummaryCard icon={ShieldAlert} label="Wash Sale Risks" value={String(washSaleRisks)} sublabel="Requires 30-day wait" color="amber" />
        <SummaryCard icon={BarChart3} label="Tax Lots Available" value={String(lotsAvailable)} sublabel="For specific lot selection" color="purple" />
      </div>

      {/* Tax-Loss Harvesting Opportunities */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Tax-Loss Harvesting Opportunities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shares</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Basis</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unrealized Loss</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Wash Sale Risk</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Tax Savings</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Substitute</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Holding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_TAX_OPPORTUNITIES.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{opp.security}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtNumber(opp.shares)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{fmtCurrencyDecimal(opp.costBasis)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{fmtCurrencyDecimal(opp.currentPrice)}</td>
                  <td className="px-5 py-3 text-sm text-red-600 text-right font-mono font-medium">{fmtCurrency(opp.unrealizedLoss)}</td>
                  <td className="px-5 py-3 text-center">
                    {opp.washSaleRisk ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-emerald-600 text-right font-mono font-medium">{fmtCurrency(opp.estimatedTaxSavings)}</td>
                  <td className="px-5 py-3 text-sm text-blue-600 font-medium">{opp.substituteSecurity}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{opp.holdingPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Lot Optimization */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <ArrowUpDown className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Tax Lot Optimization</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 border-b border-slate-200 bg-slate-50">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Long-Term Gains</p>
            <p className="text-lg font-bold text-emerald-600">{fmtCurrency(longTermGains)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Short-Term Gains</p>
            <p className="text-lg font-bold text-amber-600">{fmtCurrency(shortTermGains)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Long-Term Losses</p>
            <p className="text-lg font-bold text-red-600">{fmtCurrency(longTermLosses)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Short-Term Losses</p>
            <p className="text-lg font-bold text-red-500">{fmtCurrency(shortTermLosses)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shares</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Basis</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Value</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gain / Loss</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Term</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_TAX_LOTS.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{lot.security}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{lot.purchaseDate}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtNumber(lot.shares)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{fmtCurrency(lot.costBasis)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{fmtCurrency(lot.currentValue)}</td>
                  <td className={`px-5 py-3 text-sm text-right font-mono font-medium ${lot.gainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {lot.gainLoss >= 0 ? '+' : ''}{fmtCurrency(lot.gainLoss)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      lot.term === 'Long-Term'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {lot.term}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 4: EXECUTION HISTORY
// ============================================================================

function ExecutionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('All');
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | 'all'>('30d');

  const filteredTrades = useMemo(() => {
    let trades = [...MOCK_HISTORICAL_TRADES];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      trades = trades.filter((t) => t.symbol.toLowerCase().includes(q));
    }

    if (accountFilter !== 'All') {
      trades = trades.filter((t) => t.account === accountFilter);
    }

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      trades = trades.filter((t) => new Date(t.date) >= cutoff);
    }

    return trades;
  }, [searchTerm, accountFilter, dateRange]);

  const totalVolume = filteredTrades.reduce((s, t) => s + t.total, 0);
  const totalTrades = filteredTrades.length;
  const avgFill = totalTrades > 0
    ? filteredTrades.reduce((s, t) => s + t.price, 0) / totalTrades
    : 0;

  const uniqueAccounts = Array.from(new Set(MOCK_HISTORICAL_TRADES.map((t) => t.account)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={DollarSign} label="Total Traded Volume" value={fmtCurrency(totalVolume)} sublabel={`${totalTrades} trades`} color="blue" />
        <SummaryCard icon={BarChart3} label="Number of Trades" value={String(totalTrades)} sublabel="In selected period" color="emerald" />
        <SummaryCard icon={TrendingUp} label="Average Fill Price" value={fmtCurrencyDecimal(avgFill)} sublabel="Across all symbols" color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Execution History</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-44"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="All">All Accounts</option>
                {uniqueAccounts.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
              {(['7d', '14d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {range === 'all' ? 'All' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Symbol</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Venue</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No trades match the current filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{t.date}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 max-w-[160px] truncate">{t.account}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">{t.symbol}</td>
                    <td className="px-5 py-3"><SideBadge side={t.side} /></td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtNumber(t.quantity)}</td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtCurrencyDecimal(t.price)}</td>
                    <td className="px-5 py-3 text-sm text-slate-900 text-right font-mono font-medium">{fmtCurrency(t.total)}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{t.venue}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

import React from 'react';

const TABS: { key: TradeTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'blotter', label: 'Trade Blotter', icon: ArrowUpDown },
  { key: 'rebalancing', label: 'Rebalancing', icon: RefreshCw },
  { key: 'tax', label: 'Tax-Intelligent Trading', icon: Leaf },
  { key: 'history', label: 'Execution History', icon: CalendarDays },
];

export default function Trading() {
  const [activeTab, setActiveTab] = useState<TradeTab>('blotter');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trading & Rebalancing</h1>
        <p className="text-slate-500">Manage trades, rebalance portfolios, and optimize for taxes</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'blotter' && <TradeBlotter />}
      {activeTab === 'rebalancing' && <Rebalancing />}
      {activeTab === 'tax' && <TaxIntelligent />}
      {activeTab === 'history' && <ExecutionHistory />}
    </div>
  );
}
