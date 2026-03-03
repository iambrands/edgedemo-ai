import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, BarChart3,
  Loader2, Target, Award,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const PERIODS = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y'] as const;

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function PerformanceAccounting() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'firm' | 'account' | 'attribution'>('firm');
  const [period, setPeriod] = useState<string>('1Y');
  const [firmData, setFirmData] = useState<any>(null);
  const [acctData, setAcctData] = useState<any>(null);
  const [attrData, setAttrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAcct] = useState('acct-001');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadFirm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/performance/firm/summary`, { headers });
      setFirmData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/performance/account/${selectedAcct}?period=${period}`, { headers });
      setAcctData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token, selectedAcct, period]);

  const loadAttribution = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/performance/attribution/${selectedAcct}?period=${period}`, { headers });
      setAttrData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token, selectedAcct, period]);

  useEffect(() => {
    if (tab === 'firm') loadFirm();
    else if (tab === 'account') loadAccount();
    else loadAttribution();
  }, [tab, period, selectedAcct]);

  return (
    <div className="space-y-6">
      <PageHeader title="Performance & Accounting" subtitle="TWRR/MWRR calculations, benchmark-relative attribution, and firm-level analytics" />

      {/* Tabs & Period */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['firm', 'account', 'attribution'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'firm' ? 'Firm Overview' : t === 'account' ? 'Account Performance' : 'Attribution'}
            </button>
          ))}
        </div>
        {tab !== 'firm' && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'firm' && firmData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Firm AUM', value: fmt(firmData.total_aum), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'YTD Return', value: pct(firmData.firm_return_ytd), icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
              { label: 'Benchmark YTD', value: pct(firmData.benchmark_return_ytd), icon: Target, color: 'text-violet-600 bg-violet-50' },
              { label: 'Households', value: firmData.total_households, icon: Award, color: 'text-amber-600 bg-amber-50' },
            ].map(m => (
              <Card key={m.label} size="sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${m.color}`}><m.icon className="w-5 h-5" /></div>
                  <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{m.label}</p><p className="text-lg font-bold text-slate-900">{m.value}</p></div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Top Performers</h3>
              <div className="space-y-3">
                {firmData.top_performers?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">{p.household}</span>
                      <span className="text-xs text-slate-500 ml-2">{fmt(p.aum)}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">{pct(p.return_pct)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Asset Allocation (Firm)</h3>
              <div className="space-y-2">
                {Object.entries(firmData.asset_allocation || {}).map(([cls, w]) => (
                  <div key={cls} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-40">{cls}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                      <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${w as number}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-12 text-right">{(w as number).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : tab === 'account' && acctData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Beginning Value', value: fmt(acctData.beginning_value) },
              { label: 'Ending Value', value: fmt(acctData.ending_value) },
              { label: 'TWRR', value: pct(acctData.twrr), sub: `Annualized: ${pct(acctData.twrr_annualized)}` },
              { label: 'MWRR', value: pct(acctData.mwrr) },
            ].map(m => (
              <Card key={m.label} size="sm">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{m.label}</p>
                <p className={`text-xl font-bold ${m.label.includes('WRR') ? (parseFloat(String(m.value)) >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-slate-900'}`}>{m.value}</p>
                {m.sub && <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>}
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm">
              <p className="text-xs text-slate-500 uppercase">Alpha</p>
              <p className={`text-lg font-bold ${acctData.alpha >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(acctData.alpha)}</p>
            </Card>
            <Card size="sm">
              <p className="text-xs text-slate-500 uppercase">Sharpe Ratio</p>
              <p className="text-lg font-bold text-slate-900">{acctData.sharpe_ratio?.toFixed(2)}</p>
            </Card>
            <Card size="sm">
              <p className="text-xs text-slate-500 uppercase">Max Drawdown</p>
              <p className="text-lg font-bold text-red-600">{acctData.max_drawdown?.toFixed(2)}%</p>
            </Card>
            <Card size="sm">
              <p className="text-xs text-slate-500 uppercase">Beta</p>
              <p className="text-lg font-bold text-slate-900">{acctData.beta?.toFixed(2)}</p>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">NAV Series (Last 90 Days)</h3>
            <div className="h-40 flex items-end gap-0.5">
              {(acctData.nav_series || []).map((n: any, i: number) => {
                const max = Math.max(...(acctData.nav_series || []).map((x: any) => x.nav));
                const min = Math.min(...(acctData.nav_series || []).map((x: any) => x.nav));
                const h = max === min ? 50 : ((n.nav - min) / (max - min)) * 100;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div className={`rounded-t transition-all ${n.daily_return >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ height: `${Math.max(h, 2)}%` }} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : tab === 'attribution' && attrData ? (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Brinson-Fachler Attribution</h3>
                <p className="text-sm text-slate-500">Decomposing portfolio alpha into allocation and selection effects</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Total Alpha</p>
                <p className={`text-xl font-bold ${attrData.total_alpha >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(attrData.total_alpha)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase">Sector</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Port. Wt.</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Bench. Wt.</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Port. Return</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Bench. Return</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Allocation</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Selection</th>
                    <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(attrData.attribution || []).map((a: any) => (
                    <tr key={a.sector} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-900">{a.sector}</td>
                      <td className="py-2 text-right text-slate-600">{a.portfolio_weight.toFixed(1)}%</td>
                      <td className="py-2 text-right text-slate-600">{a.benchmark_weight.toFixed(1)}%</td>
                      <td className={`py-2 text-right font-medium ${a.portfolio_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(a.portfolio_return)}</td>
                      <td className={`py-2 text-right ${a.benchmark_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(a.benchmark_return)}</td>
                      <td className={`py-2 text-right ${a.allocation_effect >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(a.allocation_effect)}</td>
                      <td className={`py-2 text-right ${a.selection_effect >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(a.selection_effect)}</td>
                      <td className={`py-2 text-right font-semibold ${a.total_effect >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(a.total_effect)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
