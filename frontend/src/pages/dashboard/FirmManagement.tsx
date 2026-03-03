import { useEffect, useState, useCallback } from 'react';
import {
  UserPlus,
  Loader2, Building2, Key,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface Advisor {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  households_assigned: number;
  aum_managed: number;
  status: string;
  crd_number: string | null;
  licenses: string[];
  last_login: string | null;
}

interface Team {
  id: string;
  name: string;
  lead_id: string;
  members: string[];
  households: number;
  aum: number;
}

const API = import.meta.env.VITE_API_URL || '';
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

const ROLE_COLORS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  owner: 'blue', lead_advisor: 'green', advisor: 'green', associate: 'amber',
  operations: 'gray', compliance: 'red', paraplanner: 'gray', readonly: 'gray',
};

export default function FirmManagement() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'advisors' | 'teams' | 'roles' | 'audit'>('advisors');
  const [firm, setFirm] = useState<any>(null);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [firmRes, advRes, teamRes, roleRes] = await Promise.all([
        fetch(`${API}/api/v1/firm/profile`, { headers }),
        fetch(`${API}/api/v1/firm/advisors`, { headers }),
        fetch(`${API}/api/v1/firm/teams`, { headers }),
        fetch(`${API}/api/v1/firm/roles`, { headers }),
      ]);
      setFirm(await firmRes.json());
      const advData = await advRes.json();
      setAdvisors(advData.advisors || []);
      const teamData = await teamRes.json();
      setTeams(teamData.teams || []);
      const roleData = await roleRes.json();
      setRoles(roleData.roles || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/firm/audit-log?days=7`, { headers });
      const data = await res.json();
      setAuditLog(data.entries || []);
    } catch {}
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'audit') loadAudit(); }, [tab]);

  const advisorName = (id: string) => advisors.find(a => a.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <PageHeader title="Firm Management" subtitle="Multi-advisor hierarchy, role-based access control, and team administration" />

      {/* Firm Summary */}
      {firm && (
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">{firm.name}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span>CRD #{firm.crd_number}</span>
                <span>SEC {firm.sec_number}</span>
                <span>Founded {firm.founded}</span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="text-xl font-bold text-slate-900">{fmt(firm.aum_total)}</p><p className="text-xs text-slate-500">Total AUM</p></div>
              <div><p className="text-xl font-bold text-slate-900">{firm.households_total}</p><p className="text-xs text-slate-500">Households</p></div>
              <div><p className="text-xl font-bold text-slate-900">{firm.advisors_total}</p><p className="text-xs text-slate-500">Team Members</p></div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['advisors', 'teams', 'roles', 'audit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'audit' ? 'Audit Log' : t}
            </button>
          ))}
        </div>
        {tab === 'advisors' && <Button variant="primary" size="sm"><UserPlus className="w-4 h-4 mr-1" />Add Advisor</Button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'advisors' ? (
        <div className="space-y-3">
          {advisors.map(adv => (
            <Card key={adv.id} size="sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                  {adv.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{adv.name}</span>
                    <Badge variant={ROLE_COLORS[adv.role] || 'gray'} size="sm">{adv.role.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{adv.title} &middot; {adv.email}</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-slate-900">{adv.households_assigned} households</p>
                  {adv.aum_managed > 0 && <p className="text-xs text-slate-500">{fmt(adv.aum_managed)} AUM</p>}
                </div>
                <div className="text-right hidden lg:block">
                  {adv.licenses.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {adv.licenses.map(l => <span key={l} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{l}</span>)}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">Last login: {fmtDate(adv.last_login)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : tab === 'teams' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id}>
              <h3 className="font-semibold text-slate-900 mb-2">{team.name}</h3>
              <p className="text-sm text-slate-500 mb-3">Lead: {advisorName(team.lead_id)}</p>
              <div className="flex gap-4 mb-3">
                <div><p className="text-lg font-bold text-slate-900">{team.households}</p><p className="text-xs text-slate-500">Households</p></div>
                <div><p className="text-lg font-bold text-slate-900">{fmt(team.aum)}</p><p className="text-xs text-slate-500">AUM</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {team.members.map(m => (
                  <span key={m} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{advisorName(m)}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : tab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => (
            <Card key={role.id} size="sm">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">{role.name}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-3">{role.description}</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((p: string) => (
                  <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="space-y-1">
            {auditLog.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 px-2 rounded hover:bg-slate-50 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {entry.advisor_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">{entry.advisor_name}</span>
                    <span className="text-slate-500 ml-2">{entry.action}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {entry.resource && <span className="bg-slate-100 px-2 py-0.5 rounded">{entry.resource}</span>}
                  <span>{fmtDate(entry.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
