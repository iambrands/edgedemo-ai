import { useEffect, useState, useCallback } from 'react';
import { BarChart2, RefreshCw, TrendingUp, TrendingDown, Minus, Info, CheckCircle, Zap } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { b2cApi } from '../../services/b2cApi';

type Allocation = { asset_class: string; target_pct: number; current_pct: number; drift_pct: number; overweight: boolean };
type Trade = { action: string; asset_class: string; ticker: string; amount: number; reason: string };

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const CLASS_COLORS: Record<string, string> = {
  'US Equity':    '#2563EB',
  "Int'l Equity": '#10B981',
  'Bonds':        '#8B5CF6',
  'Alternatives': '#F59E0B',
  'Cash':         '#64748B',
};

const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900 tabular-nums">{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function ClientRebalancing() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [driftScore, setDriftScore] = useState(0);
  const [lastRebalanced, setLastRebalanced] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getPortfolioDrift()
      .then((data) => {
        setAllocations(data.target_allocation);
        setTrades(data.suggested_trades);
        setDriftScore(data.drift_score);
        setLastRebalanced(data.last_rebalanced);
        setThreshold(data.bands_threshold_pct);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const executeRebalance = async () => {
    setExecuting(true);
    try {
      await b2cApi.executeRebalance();
      setDone(true);
      setAllocations((prev) => prev.map((a) => ({ ...a, current_pct: a.target_pct, drift_pct: 0, overweight: false })));
      setTrades([]);
      setDriftScore(0.2);
    } catch {
      // silent
    } finally {
      setExecuting(false);
    }
  };

  const driftLabel = driftScore >= 8 ? { text: 'Critical drift', color: 'text-rose-600 bg-rose-50' }
    : driftScore >= 5 ? { text: 'Rebalance needed', color: 'text-amber-600 bg-amber-50' }
    : { text: 'Within bands', color: 'text-emerald-600 bg-emerald-50' };

  const chartData = allocations.map((a) => ({
    name: a.asset_class,
    'Current %': a.current_pct,
    'Target %': a.target_pct,
    fill: CLASS_COLORS[a.asset_class] ?? '#94A3B8',
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <BarChart2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Portfolio Rebalancing</h1>
          <p className="text-xs text-slate-500">Target allocation vs. current drift — automatically suggest trades to restore your target mix.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        </div>
      ) : (
        <>
          {done && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
              <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-800">
                <strong>Portfolio rebalanced.</strong> All allocations restored to target. New drift score: 0.2%.
              </p>
            </div>
          )}

          {/* Status strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-xl border border-slate-100 p-3 ${driftLabel.color.split(' ')[1]}`}>
              <p className={`text-lg font-bold tabular-nums ${driftLabel.color.split(' ')[0]}`}>{driftScore.toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{driftLabel.text}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">±{threshold}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Drift bands threshold</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-blue-50 p-3">
              <p className="text-lg font-bold text-blue-600">{trades.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Suggested trades</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-900">{new Date(lastRebalanced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Last rebalanced</p>
            </div>
          </div>

          {/* Drift bar chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-900 text-sm">Target vs. Current Allocation</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  {allocations.map((a) => (
                    <Bar key={`current-${a.asset_class}`} dataKey="Current %" name="Current %">
                      <Cell fill={CLASS_COLORS[a.asset_class] ?? '#94A3B8'} fillOpacity={0.85} />
                    </Bar>
                  ))}
                  <Bar dataKey="Target %" name="Target %" fill="none">
                    {allocations.map((a) => (
                      <Cell key={`target-${a.asset_class}`} fill={CLASS_COLORS[a.asset_class] ?? '#94A3B8'} fillOpacity={0.25} stroke={CLASS_COLORS[a.asset_class] ?? '#94A3B8'} strokeWidth={2} strokeDasharray="4 2" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {allocations.map((a) => (
                <div key={a.asset_class} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: CLASS_COLORS[a.asset_class] ?? '#94A3B8' }} />
                  {a.asset_class}
                </div>
              ))}
            </div>
          </div>

          {/* Allocation breakdown table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Allocation Detail</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {allocations.map((a) => {
                const DriftIcon = a.drift_pct > 0 ? TrendingUp : a.drift_pct < 0 ? TrendingDown : Minus;
                const driftCls = Math.abs(a.drift_pct) >= threshold ? 'text-rose-600' : Math.abs(a.drift_pct) >= 2 ? 'text-amber-600' : 'text-emerald-600';
                return (
                  <div key={a.asset_class} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" style={{ background: CLASS_COLORS[a.asset_class] ?? '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{a.asset_class}</p>
                      {/* drift bar */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(a.current_pct / 80) * 100}%`, background: CLASS_COLORS[a.asset_class] ?? '#94A3B8' }}
                          />
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-400"
                            style={{ left: `${(a.target_pct / 80) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{a.current_pct.toFixed(1)}%</p>
                      <p className="text-[11px] text-slate-400">target {a.target_pct.toFixed(1)}%</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${driftCls} flex-shrink-0 w-16 justify-end`}>
                      <DriftIcon size={12} />
                      {a.drift_pct > 0 ? '+' : ''}{a.drift_pct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested trades */}
          {trades.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">Suggested Trades</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Trades required to restore target allocation</p>
              </div>
              <div className="divide-y divide-slate-50">
                {trades.map((t) => (
                  <div key={`${t.action}-${t.ticker}`} className="flex items-center gap-3 px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${t.action === 'SELL' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {t.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{t.ticker} — {t.asset_class}</p>
                      <p className="text-[11px] text-slate-400">{t.reason}</p>
                    </div>
                    <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${t.action === 'SELL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {t.action === 'SELL' ? '-' : '+'}{fmt(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execute rebalance */}
          {trades.length > 0 && (
            <button
              type="button"
              onClick={executeRebalance}
              disabled={executing}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {executing ? (
                <><RefreshCw size={16} className="animate-spin" /> Rebalancing…</>
              ) : (
                <><Zap size={16} /> Execute {trades.length} trades to rebalance portfolio</>
              )}
            </button>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex gap-3">
            <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Rebalancing is triggered when any asset class drifts more than ±{threshold}% from target.
              Trades are tax-aware — gains harvested in tax-advantaged accounts first.
              Simulated execution only — no real trades are placed in demo mode.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
