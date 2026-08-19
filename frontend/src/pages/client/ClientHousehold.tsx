import { useEffect, useState } from 'react';
import { CheckCircle, Mail, Target, Users } from 'lucide-react';
import {
  b2cApi,
  type B2CHouseholdCombined,
  type B2CHouseholdMember,
  type B2CJointGoal,
} from '../../services/b2cApi';

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

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
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        {fmt(goal.current_amount)} of {fmt(goal.target_amount)}
      </p>
    </div>
  );
}

function MemberRow({ member }: { member: B2CHouseholdMember }) {
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
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{member.role}</p>
      </div>
    </div>
  );
}

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

  const load = async () => {
    setLoading(true);
    setError('');
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
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setSubmitting(true);
    setInviteError('');
    setInviteSent('');
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Household</h1>
        <p className="text-sm text-slate-500 mt-1">
          Share your financial picture with a partner — combined net worth and joint goals.
        </p>
      </div>

      {/* Combined net worth hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Combined net worth</p>
        <p className="text-4xl font-extrabold tabular-nums mt-1">
          {fmt(combined?.combined_net_worth ?? 0)}
        </p>
        <p className="text-sm text-blue-100 mt-2">
          {combined?.member_count ?? members.length} household member
          {(combined?.member_count ?? members.length) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Members</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </div>
      </div>

      {/* Invite partner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Invite partner</h2>
        </div>
        {inviteSent && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 mb-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {inviteSent}
          </div>
        )}
        {inviteError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">
            {inviteError}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="partner@example.com"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {pendingInvites.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            Pending: {pendingInvites.join(', ')}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">Demo mode — no email is actually sent.</p>
      </div>

      {/* Joint goals */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Joint goals</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(combined?.joint_goals ?? []).map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      </div>
    </div>
  );
}
