import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, CheckCircle, Loader2, ArrowRightLeft,
  Settings, AlertTriangle, Plug,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

const PROVIDER_COLORS: Record<string, string> = {
  Salesforce: 'bg-blue-500', Redtail: 'bg-red-500', Wealthbox: 'bg-emerald-500',
};

export default function CRMIntegrations() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'integrations' | 'sync-log' | 'mappings'>('integrations');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('Salesforce');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/crm-integrations/integrations`, { headers });
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadSyncLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/crm-integrations/sync-log`, { headers });
      const data = await res.json();
      setSyncLog(data.logs || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/crm-integrations/field-mappings/${selectedProvider}`, { headers });
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch {} finally { setLoading(false); }
  }, [token, selectedProvider]);

  useEffect(() => { if (tab === 'integrations') load(); else if (tab === 'sync-log') loadSyncLog(); else loadMappings(); }, [tab, selectedProvider]);

  const triggerSync = async (id: string) => {
    setSyncing(id);
    try {
      await fetch(`${API}/api/v1/crm-integrations/integrations/${id}/sync`, { method: 'POST', headers });
      await load();
    } finally { setSyncing(null); }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Integrations" subtitle="Bidirectional sync with Salesforce, Redtail, and Wealthbox" />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['integrations', 'sync-log', 'mappings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'sync-log' ? 'Sync History' : t === 'mappings' ? 'Field Mappings' : 'Integrations'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'integrations' ? (
        <div className="space-y-4">
          {integrations.map(integ => (
            <Card key={integ.id}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${PROVIDER_COLORS[integ.provider] || 'bg-slate-500'} flex items-center justify-center text-white font-bold text-lg`}>
                  {integ.provider[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{integ.provider}</h3>
                    <Badge variant={integ.status === 'connected' ? 'green' : 'gray'} size="sm">
                      {integ.status === 'connected' ? <><CheckCircle className="w-3 h-3 mr-1" />Connected</> : 'Not Connected'}
                    </Badge>
                    <Badge variant="blue" size="sm">{integ.sync_direction}</Badge>
                  </div>
                  {integ.status === 'connected' && (
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>{integ.contacts_synced} contacts</span>
                      <span>{integ.accounts_synced} accounts</span>
                      <span>{integ.activities_synced} activities</span>
                      <span>{integ.field_mappings} field mappings</span>
                      <span>Last sync: {fmtDate(integ.last_sync)}</span>
                    </div>
                  )}
                </div>
                {integ.status === 'connected' ? (
                  <div className="flex items-center gap-2">
                    {integ.sync_errors > 0 && <Badge variant="red" size="sm"><AlertTriangle className="w-3 h-3 mr-1" />{integ.sync_errors} errors</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => triggerSync(integ.id)} disabled={syncing === integ.id}>
                      {syncing === integ.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span className="ml-1">Sync Now</span>
                    </Button>
                    <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <Button variant="primary" size="sm"><Plug className="w-4 h-4 mr-1" />Connect</Button>
                )}
              </div>
              {integ.status === 'connected' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                  {integ.features.map((f: string) => (
                    <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : tab === 'sync-log' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Timestamp</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Provider</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Direction</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Updated</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Skipped</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Duration</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {syncLog.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 text-slate-700">{fmtDate(log.timestamp)}</td>
                    <td className="py-2 font-medium text-slate-900">{log.provider}</td>
                    <td className="py-2"><Badge variant="blue" size="sm">{log.direction}</Badge></td>
                    <td className="py-2 text-right text-emerald-600">{log.records_created}</td>
                    <td className="py-2 text-right text-blue-600">{log.records_updated}</td>
                    <td className="py-2 text-right text-slate-500">{log.records_skipped}</td>
                    <td className="py-2 text-right text-slate-500">{log.duration_ms}ms</td>
                    <td className="py-2"><Badge variant={log.status === 'success' ? 'green' : 'amber'} size="sm">{log.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['Salesforce', 'Redtail', 'Wealthbox'].map(p => (
              <button key={p} onClick={() => setSelectedProvider(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${selectedProvider === p ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
            ))}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Edge Field</th>
                    <th className="pb-2 text-center text-xs font-semibold text-slate-600 uppercase">Direction</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">CRM Field</th>
                    <th className="pb-2 text-center text-xs font-semibold text-slate-600 uppercase">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 font-mono text-sm text-slate-700">{m.edge_field}</td>
                      <td className="py-2 text-center"><ArrowRightLeft className="w-4 h-4 text-slate-400 mx-auto" /></td>
                      <td className="py-2 font-mono text-sm text-blue-600">{m.crm_field}</td>
                      <td className="py-2 text-center">{m.active ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
