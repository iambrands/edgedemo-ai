import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, TrendingUp, TrendingDown, DollarSign,
  Loader2, FileText, Download, Scissors,
} from 'lucide-react';
import { getTaxSummary, getTaxLots } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaxSummary {
  realized_gains_st: number; realized_gains_lt: number;
  realized_losses: number; net_realized: number;
  estimated_tax_st: number; estimated_tax_lt: number;
  total_estimated_tax: number;
  unrealized_gains: number; unrealized_losses: number;
  tax_loss_harvest_opportunities: number;
}

interface Transaction {
  date: string; symbol: string; shares: number;
  proceeds: number; cost_basis: number; gain: number;
  term: string; account: string;
}

interface TaxLot {
  symbol: string; name: string; shares: number;
  cost_basis: number; current_value: number; unrealized: number;
  term: string; purchase_date: string; account: string;
}

interface TaxDoc { name: string; status: string; date: string }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtCur = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const fmtCur2 = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalTaxCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [docs, setDocs] = useState<TaxDoc[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lots, setLots] = useState<TaxLot[]>([]);
  const [txFilter, setTxFilter] = useState<'all' | 'short' | 'long'>('all');
  const [tab, setTab] = useState<'realized' | 'lots' | 'docs'>('realized');

  useEffect(() => {
    Promise.all([getTaxSummary(), getTaxLots()])
      .then(([s, l]) => {
        setSummary(s.summary);
        setDocs(s.tax_documents || []);
        setTransactions(l.realized_transactions || []);
        setLots(l.tax_lots || []);
      })
      .catch((e) => console.error('tax load failed', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredTx = txFilter === 'all' ? transactions
    : transactions.filter((t) => t.term === txFilter);

  const harvestLots = lots.filter((l) => l.unrealized < 0);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax Center</h1>
          <p className="text-slate-500 text-sm">Tax year 2025 — Estimates for informational purposes</p>
        </div>

        {/* ── Summary Cards ──────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Realized Gains"
              value={fmtCur(summary.realized_gains_st + summary.realized_gains_lt)}
              sub={`ST: ${fmtCur(summary.realized_gains_st)} · LT: ${fmtCur(summary.realized_gains_lt)}`}
              Icon={TrendingUp}
              color="emerald"
            />
            <SummaryCard
              label="Realized Losses"
              value={fmtCur(Math.abs(summary.realized_losses))}
              sub="Offsets gains"
              Icon={TrendingDown}
              color="red"
            />
            <SummaryCard
              label="Net Realized"
              value={fmtCur(summary.net_realized)}
              sub={summary.net_realized >= 0 ? 'Net gain' : 'Net loss'}
              Icon={DollarSign}
              color="blue"
            />
            <SummaryCard
              label="Estimated Tax"
              value={fmtCur(summary.total_estimated_tax)}
              sub={`ST: ${fmtCur(summary.estimated_tax_st)} · LT: ${fmtCur(summary.estimated_tax_lt)}`}
              Icon={Receipt}
              color="amber"
            />
          </div>
        )}

        {/* ── Unrealized + Harvest ────────────────────── */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Unrealized Gains & Losses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Unrealized Gains</p>
                  <p className="text-xl font-bold text-emerald-600">{fmtCur(summary.unrealized_gains)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Unrealized Losses</p>
                  <p className="text-xl font-bold text-red-600">{fmtCur(Math.abs(summary.unrealized_losses))}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Tax-Loss Harvesting</h3>
                {summary.tax_loss_harvest_opportunities > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    {summary.tax_loss_harvest_opportunities} opportunities
                  </span>
                )}
              </div>
              {harvestLots.length > 0 ? (
                <div className="space-y-2">
                  {harvestLots.map((l) => (
                    <div key={l.symbol + l.purchase_date} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{l.symbol} — {l.name}</p>
                        <p className="text-xs text-slate-500">{l.shares} shares · {l.term}-term · {l.account}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">{fmtCur2(l.unrealized)}</p>
                        <button
                          onClick={() => navigate('/portal/requests')}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Scissors className="h-3 w-3" /> Harvest
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No tax-loss harvesting opportunities at this time.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="flex gap-2">
          {([
            { key: 'realized', label: 'Realized Transactions' },
            { key: 'lots', label: 'Tax Lots' },
            { key: 'docs', label: 'Tax Documents' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Realized Transactions ───────────────────── */}
        {tab === 'realized' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Realized Transactions</h3>
              <div className="flex gap-1">
                {(['all', 'short', 'long'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTxFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      txFilter === f ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'short' ? 'Short-term' : 'Long-term'}
                  </button>
                ))}
              </div>
            </div>
            {filteredTx.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No realized transactions for this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Symbol</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Shares</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Proceeds</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Cost Basis</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Gain/Loss</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Term</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTx.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700">{fmtDate(tx.date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{tx.symbol}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{tx.shares}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmtCur(tx.proceeds)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmtCur(tx.cost_basis)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${tx.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.gain >= 0 ? '+' : ''}{fmtCur(tx.gain)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            tx.term === 'long' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {tx.term === 'long' ? 'LT' : 'ST'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tax Lots ────────────────────────────────── */}
        {tab === 'lots' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Open Tax Lots</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Shares</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Cost Basis</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Current</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Unrealized</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Term</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Purchased</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lots.map((lot, i) => (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${lot.unrealized < 0 ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{lot.symbol}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{lot.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{lot.shares}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtCur(lot.cost_basis)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtCur(lot.current_value)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${lot.unrealized >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {lot.unrealized >= 0 ? '+' : ''}{fmtCur2(lot.unrealized)}
                        {lot.unrealized < 0 && (
                          <button onClick={() => navigate('/portal/requests')} className="ml-2 text-xs text-blue-600 hover:underline"><Scissors className="inline h-3 w-3" /></button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          lot.term === 'long' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {lot.term === 'long' ? 'LT' : 'ST'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(lot.purchase_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tax Documents ───────────────────────────── */}
        {tab === 'docs' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Tax Documents</h3>
            </div>
            {docs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No tax documents available.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                    <div className="p-2.5 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">Available: {fmtDate(d.date)}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                      d.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {d.status}
                    </span>
                    {d.status === 'available' && (
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-500 text-center">
          Tax estimates are for informational purposes only and may not reflect your actual tax liability. Consult a qualified tax professional for advice. Edge does not provide tax, legal, or accounting advice.
        </div>
    </div>
  );
}

/* ── Summary Card ─────────────────────────────────────────────────── */

function SummaryCard({ label, value, sub, Icon, color }: {
  label: string; value: string; sub: string;
  Icon: React.ElementType; color: 'emerald' | 'red' | 'blue' | 'amber';
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`p-2 rounded-lg ${colors[color]}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
