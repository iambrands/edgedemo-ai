import { useState } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, Download, Save, RotateCcw } from 'lucide-react';

interface ScreenerCriteria {
  pe_ratio_max?: number;
  peg_ratio_max?: number;
  earnings_growth_min?: number;
  revenue_growth_min?: number;
  debt_to_equity_max?: number;
  current_ratio_min?: number;
  free_cash_flow_positive?: boolean;
  dividend_yield_min?: number;
  sectors?: string[];
  sort_by: string;
  sort_order: string;
  limit: number;
}

interface ScreenerResult {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  pe_ratio: number | null;
  peg_ratio: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  free_cash_flow: number | null;
  fcf_yield: number | null;
  dividend_yield: number | null;
  price: number;
  change_percent: number;
}

const PRESETS = [
  { id: 'value', name: 'Value Stocks', description: 'Low P/E, low PEG, positive cash flow' },
  { id: 'growth', name: 'Growth Stocks', description: 'High earnings and revenue growth' },
  { id: 'dividend', name: 'Dividend Income', description: 'High yield with sustainable payout' },
  { id: 'quality', name: 'Quality Companies', description: 'Strong balance sheet, consistent growth' },
  { id: 'garp', name: 'GARP', description: 'Growth at Reasonable Price' },
];

const MOCK_STOCKS: ScreenerResult[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', market_cap: 3200, pe_ratio: 28.5, peg_ratio: 2.1, earnings_growth: 12.5, revenue_growth: 8.2, debt_to_equity: 1.8, current_ratio: 1.0, free_cash_flow: 110.5, fcf_yield: 3.4, dividend_yield: 0.5, price: 198.50, change_percent: 1.2 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', industry: 'Software', market_cap: 3100, pe_ratio: 35.2, peg_ratio: 2.4, earnings_growth: 15.8, revenue_growth: 12.1, debt_to_equity: 0.4, current_ratio: 1.8, free_cash_flow: 72.3, fcf_yield: 2.3, dividend_yield: 0.8, price: 415.20, change_percent: 0.8 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services', market_cap: 2100, pe_ratio: 24.1, peg_ratio: 1.5, earnings_growth: 22.3, revenue_growth: 14.5, debt_to_equity: 0.1, current_ratio: 2.9, free_cash_flow: 78.9, fcf_yield: 3.8, dividend_yield: 0.0, price: 175.30, change_percent: -0.3 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals', market_cap: 380, pe_ratio: 15.2, peg_ratio: 2.8, earnings_growth: 5.2, revenue_growth: 3.8, debt_to_equity: 0.5, current_ratio: 1.2, free_cash_flow: 18.5, fcf_yield: 4.9, dividend_yield: 3.1, price: 158.40, change_percent: 0.2 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', industry: 'Household Products', market_cap: 390, pe_ratio: 26.8, peg_ratio: 3.5, earnings_growth: 7.1, revenue_growth: 4.2, debt_to_equity: 0.7, current_ratio: 0.8, free_cash_flow: 15.2, fcf_yield: 3.9, dividend_yield: 2.4, price: 165.80, change_percent: 0.5 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', industry: 'Payment Processing', market_cap: 580, pe_ratio: 31.5, peg_ratio: 1.9, earnings_growth: 16.2, revenue_growth: 11.8, debt_to_equity: 0.6, current_ratio: 1.5, free_cash_flow: 19.8, fcf_yield: 3.4, dividend_yield: 0.8, price: 285.60, change_percent: 1.1 },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Health Insurance', market_cap: 480, pe_ratio: 21.2, peg_ratio: 1.4, earnings_growth: 14.5, revenue_growth: 12.8, debt_to_equity: 0.8, current_ratio: 0.9, free_cash_flow: 22.1, fcf_yield: 4.6, dividend_yield: 1.4, price: 520.30, change_percent: -0.6 },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumer Discretionary', industry: 'Home Improvement', market_cap: 350, pe_ratio: 22.8, peg_ratio: 2.2, earnings_growth: 8.9, revenue_growth: 5.5, debt_to_equity: 42.5, current_ratio: 1.3, free_cash_flow: 14.2, fcf_yield: 4.1, dividend_yield: 2.5, price: 352.40, change_percent: 0.9 },
  { ticker: 'CVX', name: 'Chevron Corp.', sector: 'Energy', industry: 'Oil & Gas', market_cap: 280, pe_ratio: 12.5, peg_ratio: 1.8, earnings_growth: -8.2, revenue_growth: -5.1, debt_to_equity: 0.2, current_ratio: 1.4, free_cash_flow: 21.5, fcf_yield: 7.7, dividend_yield: 4.2, price: 152.80, change_percent: -1.2 },
  { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', industry: 'Retail', market_cap: 390, pe_ratio: 52.1, peg_ratio: 4.2, earnings_growth: 12.4, revenue_growth: 9.8, debt_to_equity: 0.4, current_ratio: 1.0, free_cash_flow: 6.8, fcf_yield: 1.7, dividend_yield: 0.5, price: 875.20, change_percent: 0.4 },
];

function applyFilters(stocks: ScreenerResult[], criteria: ScreenerCriteria): ScreenerResult[] {
  let filtered = stocks.filter((s) => {
    if (criteria.pe_ratio_max && (s.pe_ratio === null || s.pe_ratio > criteria.pe_ratio_max)) return false;
    if (criteria.peg_ratio_max && (s.peg_ratio === null || s.peg_ratio > criteria.peg_ratio_max)) return false;
    if (criteria.earnings_growth_min && (s.earnings_growth === null || s.earnings_growth < criteria.earnings_growth_min)) return false;
    if (criteria.revenue_growth_min && (s.revenue_growth === null || s.revenue_growth < criteria.revenue_growth_min)) return false;
    if (criteria.debt_to_equity_max && (s.debt_to_equity === null || s.debt_to_equity > criteria.debt_to_equity_max)) return false;
    if (criteria.current_ratio_min && (s.current_ratio === null || s.current_ratio < criteria.current_ratio_min)) return false;
    if (criteria.free_cash_flow_positive && (s.free_cash_flow === null || s.free_cash_flow <= 0)) return false;
    if (criteria.dividend_yield_min && (s.dividend_yield === null || s.dividend_yield < criteria.dividend_yield_min)) return false;
    if (criteria.sectors && criteria.sectors.length > 0 && !criteria.sectors.includes(s.sector)) return false;
    return true;
  });

  const key = criteria.sort_by as keyof ScreenerResult;
  filtered.sort((a, b) => {
    const av = (a[key] as number) || 0;
    const bv = (b[key] as number) || 0;
    return criteria.sort_order === 'desc' ? bv - av : av - bv;
  });

  return filtered.slice(0, criteria.limit);
}

export default function StockScreener() {
  const [criteria, setCriteria] = useState<ScreenerCriteria>({
    sort_by: 'market_cap',
    sort_order: 'desc',
    limit: 50,
  });
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [hasScreened, setHasScreened] = useState(false);

  const runScreen = () => {
    setResults(applyFilters(MOCK_STOCKS, criteria));
    setHasScreened(true);
  };

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    let updated = { ...criteria };
    switch (presetId) {
      case 'value':
        updated = { ...updated, pe_ratio_max: 20, peg_ratio_max: 1.5, free_cash_flow_positive: true };
        break;
      case 'growth':
        updated = { ...updated, earnings_growth_min: 15, revenue_growth_min: 10 };
        break;
      case 'dividend':
        updated = { ...updated, dividend_yield_min: 2.5, debt_to_equity_max: 2.0, free_cash_flow_positive: true };
        break;
      case 'quality':
        updated = { ...updated, debt_to_equity_max: 1.0, current_ratio_min: 1.5, earnings_growth_min: 5, free_cash_flow_positive: true };
        break;
      case 'garp':
        updated = { ...updated, peg_ratio_max: 2.0, earnings_growth_min: 10, pe_ratio_max: 30 };
        break;
    }
    setCriteria(updated);
    setResults(applyFilters(MOCK_STOCKS, updated));
    setHasScreened(true);
  };

  const resetCriteria = () => {
    setCriteria({ sort_by: 'market_cap', sort_order: 'desc', limit: 50 });
    setActivePreset(null);
    setResults([]);
    setHasScreened(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Screener</h1>
          <p className="text-slate-500">Screen stocks using fundamental analysis criteria</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetCriteria}
            className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Save size={16} />
            Save Screen
          </button>
        </div>
      </div>

      {/* Preset Strategies */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Screens</h3>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              title={preset.description}
              className={`${
                activePreset === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } px-4 py-2 rounded-xl text-sm font-medium transition`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Criteria Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
          <Filter size={16} />
          Screening Criteria
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Max P/E Ratio</label>
            <input
              type="number"
              value={criteria.pe_ratio_max ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, pe_ratio_max: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 25"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Max PEG Ratio</label>
            <input
              type="number"
              step="0.1"
              value={criteria.peg_ratio_max ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, peg_ratio_max: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 2.0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Earnings Growth %</label>
            <input
              type="number"
              value={criteria.earnings_growth_min ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, earnings_growth_min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Revenue Growth %</label>
            <input
              type="number"
              value={criteria.revenue_growth_min ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, revenue_growth_min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 8"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Max Debt/Equity</label>
            <input
              type="number"
              step="0.1"
              value={criteria.debt_to_equity_max ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, debt_to_equity_max: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 1.5"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Current Ratio</label>
            <input
              type="number"
              step="0.1"
              value={criteria.current_ratio_min ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, current_ratio_min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 1.2"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Dividend Yield %</label>
            <input
              type="number"
              step="0.1"
              value={criteria.dividend_yield_min ?? ''}
              onChange={(e) =>
                setCriteria({ ...criteria, dividend_yield_min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="e.g., 2.0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.free_cash_flow_positive || false}
                onChange={(e) => setCriteria({ ...criteria, free_cash_flow_positive: e.target.checked || undefined })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Positive Free Cash Flow</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={runScreen}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={16} />
            Run Screen
          </button>
        </div>
      </div>

      {/* Results Table */}
      {hasScreened && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{results.length} Stocks Found</h3>
            <button className="px-4 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-700">
              <Download size={14} />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Ticker</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Sector</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Price</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Chg %</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Mkt Cap</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">P/E</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">PEG</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">EPS Gr%</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">D/E</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Div %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((stock) => (
                  <tr key={stock.ticker} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{stock.ticker}</td>
                    <td className="px-4 py-3 text-slate-900">{stock.name}</td>
                    <td className="px-4 py-3 text-slate-500">{stock.sector}</td>
                    <td className="px-4 py-3 text-right font-mono">${stock.price.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        {stock.change_percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {stock.change_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${stock.market_cap}B</td>
                    <td className="px-4 py-3 text-right font-mono">{stock.pe_ratio?.toFixed(1) ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{stock.peg_ratio?.toFixed(1) ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{stock.earnings_growth?.toFixed(1) ?? '-'}%</td>
                    <td className="px-4 py-3 text-right font-mono">{stock.debt_to_equity?.toFixed(1) ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{stock.dividend_yield?.toFixed(1) ?? '-'}%</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                      No stocks match the current criteria. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
