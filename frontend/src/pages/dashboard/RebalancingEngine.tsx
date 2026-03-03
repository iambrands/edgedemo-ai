import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle, Loader2,
  Play, Calculator,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function RebalancingEngine() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'drift' | 'trades' | 'history'>('drift');
  const [driftData, setDriftData] = useState<any>(null);
  const [trades, setTrades] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [taxAware, setTaxAware] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDrift = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/rebalancing/drift`, { headers });
      setDriftData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/rebalancing/history`, { headers });
      const data = await res.json();
      setHistory(data.history || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === 'drift') loadDrift(); else if (tab === 'history') loadHistory(); }, [tab]);

  const generateTrades = async () => {
    setGenerating(true);
    try {
      const ids = Array.from(selected);
      const res = await fetch(`${API}/api/v1/rebalancing/generate-trades`, {
        method: 'POST', headers,
        body: JSON.stringify({ account_ids: ids, tax_aware: taxAware }),
      });
      const data = await res.json();
      setTrades(data);
      setTab('trades');
    } catch {} finally { setGenerating(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!driftData) return;
    const flagged = driftData.accounts.filter((a: any) => a.needs_rebalance).map((a: any) => a.account_id);
    setSelected(new Set(flagged));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rebalancing Engine" subtitle="Threshold-based drift detection with tax-aware trade generation" />

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['drift', 'trades', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'drift' ? 'Drift Analysis' : t === 'trades' ? 'Generated Trades' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'drift' && driftData ? (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Accounts</p><p className="text-2xl font-bold text-slate-900">{driftData.total_accounts}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Flagged</p><p className="text-2xl font-bold text-red-600">{driftData.flagged_count}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Drift Threshold</p><p className="text-2xl font-bold text-amber-600">{driftData.drift_threshold}%</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Total AUM</p><p className="text-2xl font-bold text-slate-900">{fmt(driftData.total_aum)}</p></Card>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All Flagged</Button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={taxAware} onChange={e => setTaxAware(e.target.checked)} className="rounded border-slate-300" />
              Tax-Aware
            </label>
            <Button variant="primary" size="sm" onClick={generateTrades} disabled={selected.size === 0 || generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}
              Generate Trades ({selected.size})
            </Button>
          </div>

          {/* Account List */}
          <div className="space-y-2">
            {driftData.accounts.map((acct: any) => (
              <Card key={acct.account_id} size="sm" className={acct.needs_rebalance ? 'ring-1 ring-amber-300' : ''}>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={selected.has(acct.account_id)} onChange={() => toggleSelect(acct.account_id)}
                    className="rounded border-slate-300 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{acct.account_name}</span>
                      {acct.needs_rebalance ? (
                        <Badge variant="amber" size="sm"><AlertTriangle className="w-3 h-3 mr-1" />Drift {acct.max_drift_pct.toFixed(1)}%</Badge>
                      ) : (
                        <Badge variant="green" size="sm"><CheckCircle className="w-3 h-3 mr-1" />In Range</Badge>
                      )}
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{acct.model_name}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>{fmt(acct.balance)}</span>
                      <span>Last rebalanced: {acct.last_rebalanced}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : tab === 'trades' && trades ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Total Trades</p><p className="text-2xl font-bold text-slate-900">{trades.total_trades}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Buy Amount</p><p className="text-2xl font-bold text-emerald-600">{fmt(trades.total_buy_amount)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Sell Amount</p><p className="text-2xl font-bold text-red-600">{fmt(trades.total_sell_amount)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Tax Impact</p><p className="text-2xl font-bold text-amber-600">{fmt(trades.total_tax_impact)}</p></Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Action</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Symbol</th>
                    <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Shares</th>
                    <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Price</th>
                    <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Amount</th>
                    <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Tax Impact</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Lot Method</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(trades.trades || []).map((t: any) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2"><Badge variant={t.action === 'Buy' ? 'green' : 'red'} size="sm">{t.action}</Badge></td>
                      <td className="py-2 font-mono font-medium text-slate-900">{t.symbol}</td>
                      <td className="py-2 text-right text-slate-700">{t.shares.toFixed(2)}</td>
                      <td className="py-2 text-right text-slate-700">${t.estimated_price.toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{fmt(t.estimated_amount)}</td>
                      <td className={`py-2 text-right ${(t.tax_impact || 0) > 0 ? 'text-red-600' : (t.tax_impact || 0) < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {t.tax_impact != null ? fmt(t.tax_impact) : '—'}
                      </td>
                      <td className="py-2 text-xs text-slate-500">{t.lot_method}</td>
                      <td className="py-2 text-xs text-slate-500 max-w-[200px] truncate">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary"><Play className="w-4 h-4 mr-1" />Review & Release All</Button>
          </div>
        </div>
      ) : tab === 'history' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Date</th>
                  <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Accounts</th>
                  <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Trades</th>
                  <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Amount</th>
                  <th className="pb-2 text-right font-semibold text-slate-600 text-xs uppercase">Tax Savings</th>
                  <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">By</th>
                  <th className="pb-2 text-left font-semibold text-slate-600 text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-900">{h.date}</td>
                    <td className="py-2 text-right text-slate-700">{h.accounts_rebalanced}</td>
                    <td className="py-2 text-right text-slate-700">{h.trades_executed}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">{fmt(h.total_amount)}</td>
                    <td className="py-2 text-right text-emerald-600">{fmt(h.tax_savings)}</td>
                    <td className="py-2 text-slate-600">{h.initiated_by}</td>
                    <td className="py-2"><Badge variant="green" size="sm">{h.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
