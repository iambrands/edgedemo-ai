import { useEffect, useState, useCallback } from 'react';
import {
  Mail, MessageSquare, Video, Search,
  AlertTriangle, Loader2, Phone,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail, sms: Phone, portal_message: MessageSquare, video_meeting: Video, chat: MessageSquare,
};
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email', sms: 'SMS', portal_message: 'Portal', video_meeting: 'Meeting', chat: 'Chat',
};

export default function CommArchive() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'messages' | 'policies' | 'dashboard'>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/archive/dashboard`, { headers });
      setDashboard(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: '30' });
      if (channel) params.set('channel', channel);
      if (search) params.set('search', search);
      const res = await fetch(`${API}/api/v1/archive/messages?${params}`, { headers });
      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [token, channel, search]);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/archive/policies`, { headers });
      const data = await res.json();
      setPolicies(data.policies || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'messages') loadMessages();
    else loadPolicies();
  }, [tab, channel, search]);

  const fmtDate = (d: string) => new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <PageHeader title="Communication Archive" subtitle="SEC Rule 17a-4 compliant archiving across all channels with supervisory review" />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['dashboard', 'messages', 'policies'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'policies' ? 'Retention Policies' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'dashboard' && dashboard ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Total Archived</p><p className="text-2xl font-bold text-slate-900">{dashboard.total_archived}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Archived Today</p><p className="text-2xl font-bold text-blue-600">{dashboard.archived_today}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Pending Review</p><p className="text-2xl font-bold text-amber-600">{dashboard.pending_review}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Flagged Keywords</p><p className="text-2xl font-bold text-red-600">{dashboard.flagged_keywords_count}</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Channels Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(dashboard.channels || {}).map(([ch, count]) => {
                  const Icon = CHANNEL_ICONS[ch] || Mail;
                  const max = Math.max(...Object.values(dashboard.channels || {}).map(Number));
                  return (
                    <div key={ch} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 w-20">{CHANNEL_LABELS[ch] || ch}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${max ? ((count as number) / max) * 100 : 0}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-10 text-right">{count as number}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Compliance Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Retention Compliance</span>
                  <Badge variant="green">{dashboard.retention_compliance}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Storage Used</span>
                  <span className="text-sm font-semibold text-slate-700">{dashboard.storage_used_gb} GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Audit</span>
                  <span className="text-sm text-slate-700">{dashboard.last_audit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Next Audit</span>
                  <span className="text-sm text-slate-700">{dashboard.next_audit}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : tab === 'messages' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search archived messages..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-1">
              <button onClick={() => setChannel(null)} className={`px-3 py-2 text-xs font-medium rounded-lg ${!channel ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>All</button>
              {Object.keys(CHANNEL_LABELS).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} className={`px-3 py-2 text-xs font-medium rounded-lg ${channel === ch ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500">{total} messages found</p>

          <div className="space-y-2">
            {messages.map(msg => {
              const Icon = CHANNEL_ICONS[msg.channel] || Mail;
              return (
                <Card key={msg.id} size="sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100"><Icon className="w-4 h-4 text-slate-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">{msg.subject}</span>
                        {msg.flagged_keywords?.length > 0 && <Badge variant="red" size="sm"><AlertTriangle className="w-3 h-3 mr-1" />{msg.flagged_keywords.join(', ')}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{msg.from_name} → {msg.to_name} &middot; {fmtDate(msg.timestamp)}</p>
                      {msg.has_attachments && <span className="text-xs text-blue-600">{msg.attachment_count} attachment(s)</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={msg.status === 'reviewed' ? 'green' : msg.status === 'flagged_for_review' ? 'amber' : 'gray'} size="sm">{msg.status.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-slate-400 font-mono">{msg.integrity_hash}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(pol => (
            <Card key={pol.id} size="sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{pol.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{pol.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{pol.retention_years} years</p>
                    <p className="text-xs text-slate-500">Retention period</p>
                  </div>
                  <Badge variant={pol.status === 'active' ? 'green' : 'gray'}>{pol.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
