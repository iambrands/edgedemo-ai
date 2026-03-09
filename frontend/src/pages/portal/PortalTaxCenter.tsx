import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, TrendingUp, TrendingDown, DollarSign,
  Loader2, FileText, Download, Scissors,
} from 'lucide-react';
import { getTaxSummary, getTaxLots } from '../../services/portalApi';
import { formatCurrency, formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';

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

const fmtCur = (v: number) => formatCurrency(v);
const fmtCur2 = (v: number) => formatCurrency(v, { decimals: 2 });
const fmtDate = (d: string) => formatDate(d, 'medium');

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
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleUpload1040 = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Uploading...');

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('portal_token');

      let clientId = '';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          clientId = payload.client_id || '';
        } catch { /* token decode failed — backend will resolve from JWT */ }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);

      const res = await fetch(`${apiBase}/api/v1/tax/ingest`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { job_id } = await res.json();

      setUploadStatus('Processing document...');

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${apiBase}/api/v1/tax/status/${job_id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const statusData = await statusRes.json();
          if (statusData.status === 'complete') {
            clearInterval(pollInterval);
            setUploading(false);
            setUploadStatus(null);
            window.location.reload();
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            setUploading(false);
            setUploadStatus('Processing failed');
          }
        } catch {
          clearInterval(pollInterval);
          setUploading(false);
          setUploadStatus('Status check failed');
        }
      }, 3000);
    } catch {
      setUploading(false);
      setUploadStatus('Upload failed');
    }
  };

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
        <div className="flex items-center justify-between">
          <PageHeader title="Tax Center" subtitle="Tax year 2025 — Estimates for informational purposes" />
          <div className="flex items-center gap-2">
            {uploadStatus && (
              <span className="text-sm text-blue-600 animate-pulse">{uploadStatus}</span>
            )}
            <label className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
              uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              <FileText className="w-4 h-4" />
              {uploading ? 'Processing...' : 'Upload 1040'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload1040} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* ── Summary Cards ──────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Realized Gains"
              value={fmtCur(summary.realized_gains_st + summary.realized_gains_lt)}
              sublabel={`ST: ${fmtCur(summary.realized_gains_st)} · LT: ${fmtCur(summary.realized_gains_lt)}`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="emerald"
            />
            <MetricCard
              label="Realized Losses"
              value={fmtCur(Math.abs(summary.realized_losses))}
              sublabel="Offsets gains"
              icon={<TrendingDown className="h-4 w-4" />}
              color="red"
            />
            <MetricCard
              label="Net Realized"
              value={fmtCur(summary.net_realized)}
              sublabel={summary.net_realized >= 0 ? 'Net gain' : 'Net loss'}
              icon={<DollarSign className="h-4 w-4" />}
              color="blue"
            />
            <MetricCard
              label="Estimated Tax"
              value={fmtCur(summary.total_estimated_tax)}
              sublabel={`ST: ${fmtCur(summary.estimated_tax_st)} · LT: ${fmtCur(summary.estimated_tax_lt)}`}
              icon={<Receipt className="h-4 w-4" />}
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
                  <Badge variant="amber">{summary.tax_loss_harvest_opportunities} opportunities</Badge>
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
        <div className="flex flex-col sm:flex-row gap-2">
          {([
            { key: 'realized', label: 'Realized Transactions' },
            { key: 'lots', label: 'Tax Lots' },
            { key: 'docs', label: 'Tax Documents' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                          <Badge variant={tx.term === 'long' ? 'blue' : 'gray'}>
                            {tx.term === 'long' ? 'LT' : 'ST'}
                          </Badge>
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
                        <Badge variant={lot.term === 'long' ? 'blue' : 'gray'}>
                          {lot.term === 'long' ? 'LT' : 'ST'}
                        </Badge>
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
                    <Badge variant={d.status === 'available' ? 'green' : 'amber'}>
                      {d.status}
                    </Badge>
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

