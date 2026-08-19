import { useEffect, useState } from 'react';
import { CheckCircle, Mail, Target, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  b2cApi,
  type B2CHouseholdCombined,
  type B2CHouseholdMember,
  type B2CJointGoal,
} from '../../services/b2cApi';

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function fmtCompact(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ── mock NW trend (last 12 months) derived from combined NW ─────────── */
function buildCombinedTrend(combinedNW: number) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const growth = 0.72 + (i / 11) * 0.28 + (Math.sin(i * 0.8) * 0.015);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      value: Math.round(combinedNW * growth),
    };
  });
}

/* ── tooltips ─────────────────────────────────────────────────────────── */

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="font-semibold text-slate-800">{fmt(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; pct: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-500">{fmtCompact(d.value)} · {d.pct.toFixed(1)}%</p>
    </div>
  );
}

/* ── sub-components ───────────────────────────────────────────────────── */

function GoalCard({ goal }: { goal: B2CJointGoal }) {
  const pct = Math.min(goal.progress_pct, 100);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{goal.name}</p>
          <p className="text-xs text-slate-500">Target {fmtDate(goal.target_date)}</p>
        </div>
        <span className="text-xs font-medium text-slate-600 tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 tabular-nums">{fmtCompact(goal.current_amount)} of {fmtCompact(goal.target_amount)}</p>
    </div>
  );
}

function MemberRow({ member, totalNW }: { member: B2CHouseholdMember; totalNW: number }) {
  const pct = totalNW > 0 ? (member.net_worth / totalNW) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
        {member.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
        <p className="text-xs text-slate-500 truncate">{member.email}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(member.net_worth)}</p>
        <p className="text-[10px] text-slate-400">{pct.toFixed(1)}% of household</p>
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

const MEMBER_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

export default function ClientHousehold() {
  const [members, setMembers] = useState<B2CHouseholdMember[]>([]);
  const [combined, setCombined] = useState<B2CHouseholdCombined | null>(null);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [membersRes, combinedRes] = await Promise.all([
          b2cApi.getHouseholdMembers(),
          b2cApi.getHouseholdCombinedNetWorth(),
        ]);
        setMembers(membersRes.members);
        setPendingInvites(membersRes.pending_invites);
        setCombined(combinedRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load household');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setSubmitting(true); setInviteError(''); setInviteSent('');
    try {
      await b2cApi.inviteHouseholdMember(email);
      setInviteSent(`Invitation sent to ${email}`);
      setInviteEmail('');
      setPendingInvites((prev) => (prev.includes(email.toLowerCase()) ? prev : [...prev, email.toLowerCase()]));
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" /></div>;
  }
  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  const combinedNW = combined?.combined_net_worth ?? 0;
  const trendData = buildCombinedTrend(combinedNW);

  /* Pie data from member net worths */
  const pieData = members.map((m) => ({
    name: m.name.split(' ')[0],
    value: m.net_worth,
    pct: combinedNW > 0 ? (m.net_worth / combinedNW) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Household</h1>
        <p className="text-sm text-slate-500 mt-1">Combined financial picture — net worth, goals, and partner sharing.</p>
      </div>

      {/* ── combined NW hero + trend ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Combined Net Worth</p>
          <p className="text-4xl font-extrabold text-slate-900 mt-1 tabular-nums">{fmt(combinedNW)}</p>
          <p className="text-xs text-slate-500 mt-1">{combined?.member_count ?? members.length} household member{(combined?.member_count ?? members.length) !== 1 ? 's' : ''}</p>
        </div>
        <div className="h-32 px-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="householdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} fill="url(#householdGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── contribution breakdown ──────────────────────────────────────── */}
      {members.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Net Worth Contribution</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} stroke="none">
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {pieData.map((item, idx) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }} />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900 tabular-nums">{fmtCompact(item.value)}</span>
                      <span className="text-xs text-slate-400 ml-1">({item.pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── members ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Members</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((m) => <MemberRow key={m.id} member={m} totalNW={combinedNW} />)}
        </div>
      </div>

      {/* ── invite partner ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Invite partner</h2>
        </div>
        {inviteSent && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 mb-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />{inviteSent}
          </div>
        )}
        {inviteError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">{inviteError}</div>
        )}
        <form onSubmit={handleInvite} className="flex gap-2">
          <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="partner@example.com"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <button type="submit" disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {pendingInvites.length > 0 && <p className="text-xs text-slate-500 mt-3">Pending: {pendingInvites.join(', ')}</p>}
        <p className="text-xs text-slate-400 mt-2">Demo mode — no email is actually sent.</p>
      </div>

      {/* ── joint goals ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Joint goals</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(combined?.joint_goals ?? []).map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      </div>
    </div>
  );
}
