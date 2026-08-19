import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Briefcase, Minus } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

export interface Holding {
  symbol: string;
  description: string;
  quantity: number | null;
  price: number | null;
  market_value: number;
  security_type: string;
  asset_class: string;
  gain_pct?: number;
  cost_basis?: number;
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function Sparkline({ positive }: { positive: boolean }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    let val = 50;
    for (let i = 0; i < 20; i++) {
      val += (Math.random() - (positive ? 0.4 : 0.6)) * 8;
      val = Math.max(10, Math.min(90, val));
      pts.push(val);
    }
    if (positive) pts[pts.length - 1] = Math.max(pts[pts.length - 1], 60);
    else pts[pts.length - 1] = Math.min(pts[pts.length - 1], 40);
    return pts;
  }, [positive]);

  const path = points
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / 19) * 60},${100 - y}`)
    .join(' ');

  return (
    <svg width="60" height="24" viewBox="0 0 60 100" preserveAspectRatio="none" className="flex-shrink-0">
      <path
        d={path}
        fill="none"
        stroke={positive ? '#10B981' : '#EF4444'}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GainBadge({ gain }: { gain: number | undefined }) {
  if (gain == null) return <Minus className="w-3 h-3 text-slate-300" />;
  const positive = gain >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(gain).toFixed(1)}%
    </span>
  );
}

type SortKey = 'value' | 'gain' | 'symbol';

export function HoldingsTable() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('value');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    b2cApi
      .getHoldings()
      .then((res) => setHoldings(Array.isArray(res.holdings) ? res.holdings : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const list = [...holdings];
    if (sortBy === 'value') list.sort((a, b) => b.market_value - a.market_value);
    else if (sortBy === 'gain') list.sort((a, b) => (b.gain_pct ?? 0) - (a.gain_pct ?? 0));
    else list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return list;
  }, [holdings, sortBy]);

  const displayed = showAll ? sorted : sorted.slice(0, 10);
  const totalValue = holdings.reduce((s, h) => s + h.market_value, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (holdings.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Holdings</h2>
          <span className="text-xs text-slate-400">{holdings.length} positions &middot; {formatCurrency(totalValue)}</span>
        </div>
        <div className="flex gap-1">
          {(['value', 'gain', 'symbol'] as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                sortBy === key ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {key === 'value' ? 'Value' : key === 'gain' ? 'Gain' : 'A-Z'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-slate-50">
        {displayed.map((h) => (
          <div key={h.symbol} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/50 transition-colors">
            {/* Symbol + description */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{h.symbol}</p>
              <p className="text-[11px] text-slate-400 truncate">{h.description}</p>
            </div>

            {/* Sparkline */}
            <Sparkline positive={(h.gain_pct ?? 0) >= 0} />

            {/* Gain */}
            <div className="w-16 text-right">
              <GainBadge gain={h.gain_pct} />
            </div>

            {/* Value */}
            <div className="w-20 text-right">
              <p className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(h.market_value)}</p>
              {h.quantity != null && (
                <p className="text-[10px] text-slate-400 tabular-nums">{h.quantity.toLocaleString()} shares</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show more */}
      {holdings.length > 10 && (
        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 font-medium hover:text-blue-700"
          >
            {showAll ? 'Show top 10' : `Show all ${holdings.length} positions`}
          </button>
        </div>
      )}
    </div>
  );
}
