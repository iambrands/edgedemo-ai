import { useEffect, useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown,
  Loader2, Eye, MessageSquare, Clock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function EngagementAnalytics() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'dashboard' | 'clients' | 'at-risk'>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/engagement/dashboard`, { headers });
      setDashboard(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/engagement/clients?sort_by=engagement_score&order=desc`, { headers });
      const data = await res.json();
      setClients(data.clients || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadAtRisk = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/engagement/at-risk`, { headers });
      setAtRisk(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'clients') loadClients();
    else loadAtRisk();
  }, [tab]);

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };
  const scoreBg = (score: number) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Engagement Analytics" subtitle="Track client portal usage, identify at-risk clients, and measure satisfaction" />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['dashboard', 'clients', 'at-risk'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'at-risk' ? 'At-Risk Clients' : t === 'clients' ? 'All Clients' : 'Dashboard'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'dashboard' && dashboard ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Avg Engagement Score</p><p className={`text-2xl font-bold ${scoreColor(dashboard.average_engagement_score)}`}>{dashboard.average_engagement_score}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">At-Risk Clients</p><p className="text-2xl font-bold text-red-600">{dashboard.at_risk_count}<span className="text-sm text-red-400 ml-1">({fmt(dashboard.at_risk_aum)} AUM)</span></p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Portal Adoption</p><p className="text-2xl font-bold text-blue-600">{dashboard.portal_adoption_rate}%</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">NPS Score</p><p className="text-2xl font-bold text-emerald-600">{dashboard.nps_score?.toFixed(0)}</p><p className="text-xs text-slate-500">Promoters: {dashboard.promoters_pct}%</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Engagement by Segment</h3>
              <div className="space-y-4">
                {Object.entries(dashboard.engagement_by_segment || {}).map(([seg, score]) => (
                  <div key={seg} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-28">{seg}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${scoreBg(score as number)}`} style={{ width: `${score as number}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-10 text-right ${scoreColor(score as number)}`}>{(score as number).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Activity Metrics (30-Day Avg)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-blue-50 rounded-xl p-4">
                  <Eye className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{dashboard.avg_logins_30d}</p>
                  <p className="text-xs text-blue-600">Avg Logins/30d</p>
                </div>
                <div className="text-center bg-violet-50 rounded-xl p-4">
                  <Clock className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-violet-700">{dashboard.avg_session_minutes?.toFixed(1)}</p>
                  <p className="text-xs text-violet-600">Avg Session (min)</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : tab === 'clients' ? (
        <div className="space-y-2">
          {clients.map(client => (
            <Card key={client.id} size="sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: `hsl(${client.engagement_score * 1.2}, 60%, 50%)` }}>
                  {client.engagement_score}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{client.name}</span>
                    {trendIcon(client.engagement_trend)}
                    {client.at_risk && <Badge variant="red" size="sm">At Risk</Badge>}
                    <Badge variant={client.satisfaction === 'promoter' ? 'green' : client.satisfaction === 'detractor' ? 'red' : 'gray'} size="sm">{client.satisfaction}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{client.advisor} &middot; {client.segment} &middot; {fmt(client.aum)}</p>
                </div>
                <div className="hidden md:flex gap-6 text-center">
                  <div><p className="text-sm font-bold text-slate-700">{client.logins_30d}</p><p className="text-xs text-slate-400">Logins</p></div>
                  <div><p className="text-sm font-bold text-slate-700">{client.documents_viewed_30d}</p><p className="text-xs text-slate-400">Docs</p></div>
                  <div><p className="text-sm font-bold text-slate-700">{client.messages_sent_30d}</p><p className="text-xs text-slate-400">Messages</p></div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Last login: {client.last_login ? new Date(client.last_login).toLocaleDateString() : 'Never'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : atRisk ? (
        <div className="space-y-4">
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{atRisk.total} at-risk clients with {fmt(atRisk.total_aum_at_risk)} in AUM</p>
                <p className="text-sm text-red-700">These clients show declining engagement and may require proactive outreach</p>
              </div>
            </div>
          </Card>

          {(atRisk.recommended_actions || []).map((action: any) => {
            const client = (atRisk.clients || []).find((c: any) => c.id === action.client_id);
            return (
              <Card key={action.client_id} size="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{action.client_name}</span>
                      <Badge variant={action.priority === 'high' ? 'red' : 'amber'} size="sm">{action.priority}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{action.action}</p>
                    {client && <p className="text-xs text-slate-500 mt-0.5">{fmt(client.aum)} AUM &middot; {action.days_since_login} days since last login &middot; Score: {client.engagement_score}</p>}
                  </div>
                  <Button variant="primary" size="sm"><MessageSquare className="w-4 h-4 mr-1" />Reach Out</Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
