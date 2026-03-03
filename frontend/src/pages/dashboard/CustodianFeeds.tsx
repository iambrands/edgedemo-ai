import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi,
  Loader2, Database, Shield, TrendingUp, Plus,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface Connection {
  id: string;
  custodian: string;
  status: string;
  accounts_linked: number;
  last_sync: string | null;
  next_sync: string | null;
  sync_frequency: string;
  connection_type: string;
  error: string | null;
  created_at: string;
}

interface Account {
  id: string;
  connection_id: string;
  custodian: string;
  account_number: string;
  account_name: string;
  account_type: string;
  balance: number;
  household_id: string | null;
  last_updated: string;
}

const API = import.meta.env.VITE_API_URL || '';

export default function CustodianFeeds() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAum, setTotalAum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [tab, setTab] = useState<'connections' | 'accounts' | 'reconciliation'>('connections');
  const [recon, setRecon] = useState<any>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, acctRes] = await Promise.all([
        fetch(`${API}/api/v1/custodian-feeds/connections`, { headers }),
        fetch(`${API}/api/v1/custodian-feeds/accounts`, { headers }),
      ]);
      const connData = await connRes.json();
      const acctData = await acctRes.json();
      setConnections(connData.connections || []);
      setAccounts(acctData.accounts || []);
      setTotalAum(connData.total_aum || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadRecon = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/custodian-feeds/reconciliation`, { headers });
      setRecon(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { if (tab === 'reconciliation') loadRecon(); }, [tab]);

  const syncConn = async (id: string) => {
    setSyncing(id);
    try {
      await fetch(`${API}/api/v1/custodian-feeds/connections/${id}/sync`, { method: 'POST', headers });
      await load();
    } finally {
      setSyncing(null);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const statusIcon = (s: string) => {
    if (s === 'active') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s === 'syncing') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (s === 'error') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };
  const statusVariant = (s: string): 'green' | 'blue' | 'red' | 'amber' => {
    if (s === 'active') return 'green';
    if (s === 'syncing') return 'blue';
    if (s === 'error') return 'red';
    return 'amber';
  };

  const activeConns = connections.filter(c => c.status === 'active').length;
  const totalAccounts = connections.reduce((s, c) => s + c.accounts_linked, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Custodian Data Feeds" subtitle="Real-time connections to Schwab, Fidelity, Pershing, and more via Plaid & direct feeds" />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total AUM', value: fmt(totalAum), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Active Connections', value: `${activeConns} / ${connections.length}`, icon: Wifi, color: 'text-blue-600 bg-blue-50' },
          { label: 'Linked Accounts', value: totalAccounts, icon: Database, color: 'text-violet-600 bg-violet-50' },
          { label: 'Daily Reconciliation', value: 'Automated', icon: Shield, color: 'text-amber-600 bg-amber-50' },
        ].map(m => (
          <Card key={m.label} size="sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${m.color}`}><m.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{m.label}</p>
                <p className="text-lg font-bold text-slate-900">{m.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['connections', 'accounts', 'reconciliation'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'connections' ? (
        <div className="space-y-3">
          {connections.map(c => (
            <Card key={c.id} size="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {statusIcon(c.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.custodian}</span>
                      <Badge variant={statusVariant(c.status)} size="sm">{c.status}</Badge>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.connection_type === 'direct_feed' ? 'Direct Feed' : 'Plaid'}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>{c.accounts_linked} accounts</span>
                      <span>Last sync: {fmtDate(c.last_sync)}</span>
                      {c.next_sync && <span>Next: {fmtDate(c.next_sync)}</span>}
                    </div>
                    {c.error && <p className="text-xs text-red-600 mt-1">{c.error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => syncConn(c.id)} disabled={syncing === c.id}>
                    {syncing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="ml-1">Sync</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <button className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Connect New Custodian
          </button>
        </div>
      ) : tab === 'accounts' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-3 font-semibold text-slate-600 text-xs uppercase">Account Name</th>
                  <th className="pb-3 font-semibold text-slate-600 text-xs uppercase">Custodian</th>
                  <th className="pb-3 font-semibold text-slate-600 text-xs uppercase">Type</th>
                  <th className="pb-3 font-semibold text-slate-600 text-xs uppercase">Account #</th>
                  <th className="pb-3 font-semibold text-slate-600 text-xs uppercase text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900">{a.account_name}</td>
                    <td className="py-3 text-slate-600">{a.custodian}</td>
                    <td className="py-3"><Badge variant="blue" size="sm">{a.account_type}</Badge></td>
                    <td className="py-3 text-slate-500 font-mono text-xs">{a.account_number}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">{fmt(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={4} className="py-3 font-semibold text-slate-700">Total</td>
                  <td className="py-3 text-right font-bold text-slate-900">{fmt(accounts.reduce((s, a) => s + a.balance, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          {recon ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Daily Reconciliation</h3>
                  <p className="text-sm text-slate-500">Automated comparison of custodian data vs. internal records</p>
                </div>
                <Badge variant={recon.status === 'complete' ? 'green' : 'amber'}>{recon.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{recon.accounts_reconciled}</p>
                  <p className="text-xs text-emerald-600 mt-1">Accounts Reconciled</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{recon.discrepancies}</p>
                  <p className="text-xs text-emerald-600 mt-1">Discrepancies</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-blue-700">{fmtDate(recon.next_reconciliation)}</p>
                  <p className="text-xs text-blue-600 mt-1">Next Scheduled</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">History (Last 7 Days)</h4>
                <div className="space-y-1">
                  {(recon.history || []).map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                      <span className="text-slate-600">{h.date}</span>
                      <span className="text-slate-500">{h.accounts} accounts</span>
                      <Badge variant={h.discrepancies === 0 ? 'green' : 'red'} size="sm">{h.discrepancies} issues</Badge>
                      <span className="text-xs text-slate-400">{h.duration_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
          )}
        </Card>
      )}
    </div>
  );
}
