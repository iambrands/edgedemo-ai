import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle, Leaf, RefreshCw, Info, Zap, ShieldAlert,
} from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type TLHCandidate = {
  id: string; symbol: string; name: string; shares: number;
  cost_basis: number; current_value: number; unrealized_loss: number;
  wash_sale_risk: boolean; replacement_symbol: string; replacement_name: string;
  estimated_tax_savings: number; account: string; days_held: number;
};

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function ClientAutoHarvest() {
  const [candidates, setCandidates] = useState<TLHCandidate[]>([]);
  const [totals, setTotals] = useState({ loss: 0, savings: 0, safe: 0, wash: 0 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ harvested: number; savings: number; message: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getTLHCandidates()
      .then((data) => {
        setCandidates(data.candidates);
        setTotals({ loss: data.total_unrealized_loss, savings: data.total_estimated_savings, safe: data.safe_to_harvest, wash: data.wash_sale_count });
        // Pre-select safe candidates
        setSelected(new Set(data.candidates.filter((c) => !c.wash_sale_risk).map((c) => c.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCandidates = candidates.filter((c) => selected.has(c.id));
  const selectedLoss = selectedCandidates.reduce((s, c) => s + c.unrealized_loss, 0);
  const selectedSavings = selectedCandidates.reduce((s, c) => s + c.estimated_tax_savings, 0);

  const executeHarvest = async () => {
    setExecuting(true);
    try {
      const res = await b2cApi.executeTLH(Array.from(selected));
      setResult({ harvested: res.harvested_count, savings: res.estimated_tax_savings, message: res.message });
      setCandidates((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
    } catch {
      // silent
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Automated Tax-Loss Harvesting</h1>
          <p className="text-xs text-slate-500">
            Identify and execute tax-loss harvests to offset capital gains — replacement securities purchased immediately to maintain market exposure.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Success result */}
          {result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
              <CheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Harvest executed successfully</p>
                <p className="text-xs text-emerald-700 mt-0.5">{result.message}</p>
                <p className="text-xs text-emerald-700 font-medium mt-1">Estimated tax savings: {fmt(result.savings)}</p>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total harvestable loss', value: fmt(Math.abs(totals.loss)), tone: 'text-rose-600 bg-rose-50' },
              { label: 'Estimated tax savings', value: fmt(totals.savings), tone: 'text-emerald-600 bg-emerald-50' },
              { label: 'Safe to harvest now', value: `${totals.safe} positions`, tone: 'text-blue-600 bg-blue-50' },
              { label: 'Wash-sale caution', value: `${totals.wash} flagged`, tone: 'text-amber-600 bg-amber-50' },
            ].map(({ label, value, tone }) => (
              <div key={label} className={`rounded-xl border border-slate-100 p-3 ${tone.split(' ')[1]}`}>
                <p className={`text-lg font-bold tabular-nums ${tone.split(' ')[0]}`}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Harvest candidates */}
          {candidates.length === 0 && !result ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="font-medium">No harvest candidates found. Portfolio is optimized.</p>
            </div>
          ) : candidates.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 text-sm">Harvest Candidates ({candidates.length})</h2>
                <p className="text-xs text-slate-400">{selected.size} selected · {fmt(Math.abs(selectedLoss))} loss · est. {fmt(selectedSavings)} savings</p>
              </div>
              <div className="divide-y divide-slate-50">
                {candidates.map((c) => (
                  <div key={c.id} className={`p-4 ${c.wash_sale_risk ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        disabled={c.wash_sale_risk}
                        className="mt-1 h-4 w-4 rounded accent-blue-600 disabled:opacity-40"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{c.symbol}</span>
                              <span className="text-xs text-slate-500">{c.name}</span>
                              {c.wash_sale_risk && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                                  <ShieldAlert size={9} /> Wash-sale risk
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{c.account} · {c.days_held} days held · {c.shares} shares</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-rose-600 tabular-nums">{fmt(c.unrealized_loss)}</p>
                            <p className="text-[11px] text-emerald-600 font-medium">saves ~{fmt(c.estimated_tax_savings)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400">Cost basis</p>
                            <p className="font-medium text-slate-700 tabular-nums">{fmt(c.cost_basis)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current value</p>
                            <p className="font-medium text-slate-700 tabular-nums">{fmt(c.current_value)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Loss</p>
                            <p className="font-bold text-rose-600 tabular-nums">{fmt(c.unrealized_loss)} ({(((c.current_value - c.cost_basis) / c.cost_basis) * 100).toFixed(1)}%)</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Replace with</p>
                            <p className="font-medium text-blue-700">{c.replacement_symbol} — {c.replacement_name}</p>
                          </div>
                        </div>

                        {c.wash_sale_risk && (
                          <p className="text-[11px] text-amber-700 flex items-center gap-1">
                            <AlertTriangle size={11} />
                            A substantially identical security was purchased within the last 30 days. Harvesting now would trigger wash-sale rule and disallow the loss.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Execute button */}
          {selected.size > 0 && (
            <button
              type="button"
              onClick={executeHarvest}
              disabled={executing}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {executing ? (
                <><RefreshCw size={16} className="animate-spin" /> Executing harvest…</>
              ) : (
                <><Zap size={16} /> Execute harvest for {selected.size} position{selected.size > 1 ? 's' : ''} · est. {fmt(selectedSavings)} in savings</>
              )}
            </button>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex gap-3">
            <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> Firmum sells the losing position and immediately repurchases a substantially similar (not identical) security to maintain your market exposure while realizing the tax loss.
              A 30-day wash-sale window applies — avoid repurchasing the sold security during this period.
              These are educational simulations. Actual tax impact depends on your tax bracket and other gains/losses.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
