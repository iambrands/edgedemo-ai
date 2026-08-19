import { useEffect, useState, useCallback } from 'react';
import {
  Banknote, TrendingUp, ArrowRight, Shield, Info, CheckCircle, AlertTriangle, Percent,
} from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type CashAccount = { id: string; name: string; balance: number; current_apy: number; account_type: string };
type HYSARate = { bank: string; apy: number; min_balance: number; fdic: boolean; featured: boolean };

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const ACCT_TYPE_LABEL: Record<string, string> = {
  checking: 'Checking', savings: 'Savings', money_market: 'Money Market', hysa: 'HYSA',
};

export default function ClientCashManagement() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [rates, setRates] = useState<HYSARate[]>([]);
  const [totals, setTotals] = useState({ total: 0, lowYield: 0, bestApy: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getCashManagement()
      .then((data) => {
        setAccounts(data.accounts);
        setRates(data.hysa_rates);
        setTotals({
          total: data.total_cash,
          lowYield: data.low_yield_balance,
          bestApy: data.best_available_apy,
          missed: data.missed_annual_interest,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const firmumRate = rates.find((r) => r.featured);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Banknote className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Cash Management</h1>
          <p className="text-xs text-slate-500">Optimize idle cash with high-yield savings — compare rates and see what you're leaving on the table.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Missed yield alert */}
          {totals.missed > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  You're leaving <span className="text-amber-600">{fmt(totals.missed)}/year</span> in interest on the table
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {fmt(totals.lowYield)} is sitting in accounts earning less than 1% APY.
                  Moving it to {totals.bestApy}% HYSA would earn {fmt(totals.missed)} more annually.
                </p>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total cash & equivalents', value: fmt(totals.total), color: 'text-slate-900 bg-slate-50' },
              { label: 'Low-yield cash (<1%)', value: fmt(totals.lowYield), color: 'text-amber-700 bg-amber-50' },
              { label: 'Best available APY', value: `${totals.bestApy}%`, color: 'text-emerald-700 bg-emerald-50' },
              { label: 'Missed interest/yr', value: fmt(totals.missed), color: 'text-rose-700 bg-rose-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl border border-slate-100 p-3 ${color.split(' ')[1]}`}>
                <p className={`text-base font-bold tabular-nums ${color.split(' ')[0]}`}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Cash accounts */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Your Cash Accounts</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Banknote size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-400">{ACCT_TYPE_LABEL[a.account_type] ?? a.account_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(a.balance)}</p>
                    <p className={`text-xs font-medium tabular-nums ${a.current_apy < 1 ? 'text-amber-600' : a.current_apy > 4 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {a.current_apy.toFixed(2)}% APY
                    </p>
                  </div>
                  {a.current_apy < 1 && (
                    <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Low yield</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* HYSA comparison table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">HYSA Rate Comparison</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Rates as of Aug 2026 · FDIC-insured unless noted</p>
            </div>
            <div className="divide-y divide-slate-50">
              {[...rates].sort((a, b) => b.apy - a.apy).map((r) => (
                <div key={r.bank} className={`flex items-center gap-3 px-4 py-3 ${r.featured ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{r.bank}</p>
                      {r.featured && (
                        <span className="text-[10px] bg-blue-600 text-white font-semibold px-1.5 py-0.5 rounded-full">Firmum partners</span>
                      )}
                      {r.fdic && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <Shield size={9} /> FDIC
                        </span>
                      )}
                    </div>
                    {r.min_balance > 0 && (
                      <p className="text-[11px] text-slate-400">Min balance: {fmt(r.min_balance)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold tabular-nums ${r.featured ? 'text-blue-600' : 'text-slate-900'}`}>
                      {r.apy.toFixed(2)}%
                    </span>
                    {r.featured && (
                      <button
                        type="button"
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Open <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interest calculator */}
          {firmumRate && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <TrendingUp size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">What {fmt(totals.lowYield)} earns at {firmumRate.apy}%</p>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      { label: 'Monthly', value: totals.lowYield * (firmumRate.apy / 100 / 12) },
                      { label: '1 year', value: totals.lowYield * (firmumRate.apy / 100) },
                      { label: '5 years', value: totals.lowYield * ((Math.pow(1 + firmumRate.apy / 100, 5) - 1)) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-sm font-bold text-blue-700 tabular-nums">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex gap-3">
            <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Rates shown are variable and subject to change. FDIC insurance covers up to $250,000 per depositor per institution.
              Firmum Cash Reserve uses partner bank sweep programs, which may extend FDIC coverage. Consult each institution for current terms.
            </p>
          </div>

          {/* Transfer modal (demo) */}
          {showTransferModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Percent size={16} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Open Firmum Cash Reserve</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Earn <strong>{firmumRate?.apy}% APY</strong> on your idle cash — no minimum balance, no fees, FDIC insured.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Get started
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <CheckCircle size={11} className="text-emerald-400" />
                  Demo only — no real account is opened
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
