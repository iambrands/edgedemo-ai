import { useState, useEffect } from 'react';
import {
  Home, Users, ChevronRight, Loader2, X,
  TrendingUp, Briefcase, GraduationCap, Eye, Lock, Shield,
} from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getFamilyData, getFamilyMemberDetails } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MemberAccount { name: string; value: number; type: string }

interface Member {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  total_value: number;
  accounts_count: number;
  ytd_return: number;
  can_view_details: boolean;
  accounts?: MemberAccount[];
}

interface Dependent {
  name: string;
  relationship: string;
  age: number;
  has_529: boolean;
  plan_value: number;
}

interface JointAccount { name: string; value: number; type: string }

interface FamilyData {
  household_name: string;
  total_household_value: number;
  members: Member[];
  dependents?: Dependent[];
  joint_accounts?: JointAccount[];
  household_allocation: { equity: number; fixed_income: number; alternatives: number };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtCur = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const ALLOC_COLORS = [
  { key: 'equity', label: 'Equity', color: 'bg-blue-500' },
  { key: 'fixed_income', label: 'Fixed Income', color: 'bg-emerald-500' },
  { key: 'alternatives', label: 'Alternatives', color: 'bg-purple-500' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalFamily() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FamilyData | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);

  useEffect(() => {
    getFamilyData()
      .then((d) => setData(d))
      .catch((e) => console.error('Failed to load family data', e))
      .finally(() => setLoading(false));
  }, []);

  const openMember = async (m: Member) => {
    if (!m.can_view_details) return;
    if (m.accounts) {
      setSelectedMember(m);
      return;
    }
    setLoadingMember(true);
    try {
      const detail = await getFamilyMemberDetails(m.id);
      setSelectedMember(detail);
    } catch {
      setSelectedMember(m);
    } finally {
      setLoadingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalNav />
        <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      </div>
    );
  }

  if (!data) return null;

  const alloc = data.household_allocation;
  const totalMembers = data.members.length;
  const totalAccounts = data.members.reduce((s, m) => s + m.accounts_count, 0);
  const dependents = data.dependents || [];
  const jointAccounts = (data.joint_accounts || []).filter((j) => j.value > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Dashboard</h1>
          <p className="text-slate-500 text-sm">Household overview and linked family members</p>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-3 p-3 bg-slate-100 rounded-lg">
          <Shield className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            Family members can only see what has been authorized by each account holder. Manage sharing preferences in <a href="/portal/settings" className="text-blue-600 hover:underline font-medium">Settings</a>.
          </p>
        </div>

        {/* Household Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-50 rounded-xl"><Home className="h-5 w-5 text-blue-600" /></div>
                <h2 className="text-xl font-bold text-slate-900">{data.household_name}</h2>
              </div>
              <p className="text-3xl font-bold text-slate-900">{fmtCur(data.total_household_value)}</p>
              <p className="text-sm text-slate-500 mt-1">{totalMembers} member{totalMembers !== 1 ? 's' : ''} &middot; {totalAccounts} accounts</p>
            </div>

            {/* Allocation */}
            <div className="w-full lg:w-72 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Household Allocation</h3>
              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden">
                {ALLOC_COLORS.map(({ key, color }) => {
                  const pct = (alloc as any)[key] || 0;
                  return pct > 0 ? <div key={key} className={`${color}`} style={{ width: `${pct}%` }} /> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {ALLOC_COLORS.map(({ key, label, color }) => {
                  const pct = (alloc as any)[key] || 0;
                  return (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-xs text-slate-600">{label}</span>
                      <span className="text-xs font-semibold text-slate-900">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Family Members
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.members.map((m) => (
              <div
                key={m.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  m.can_view_details ? 'hover:shadow-md cursor-pointer border-slate-200' : 'border-slate-200 opacity-80'
                }`}
                onClick={() => m.can_view_details && openMember(m)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        m.is_self ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{m.name}</p>
                          {m.is_self && <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">You</span>}
                        </div>
                        <p className="text-sm text-slate-500">{m.relationship}</p>
                      </div>
                    </div>
                    {m.can_view_details ? (
                      <Eye className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-300" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{fmtCur(m.total_value)}</p>
                      <p className="text-xs text-slate-500">Total Value</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${m.ytd_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        +{m.ytd_return}%
                      </p>
                      <p className="text-xs text-slate-500">YTD Return</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{m.accounts_count}</p>
                      <p className="text-xs text-slate-500">Accounts</p>
                    </div>
                  </div>
                </div>

                {m.can_view_details && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">View Details</span>
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dependents */}
        {dependents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Dependents &amp; Education
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dependents.map((dep) => (
                <div key={dep.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{dep.name}</p>
                      <p className="text-sm text-slate-500">{dep.relationship} &middot; Age {dep.age}</p>
                    </div>
                  </div>
                  {dep.has_529 ? (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500">529 Education Plan</p>
                        <p className="text-lg font-bold text-slate-900">{fmtCur(dep.plan_value)}</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-sm text-slate-500">No 529 plan</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">Talk to your advisor about opening one</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joint Accounts */}
        {jointAccounts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Joint Accounts
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {jointAccounts.map((ja, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="p-2 bg-indigo-50 rounded-lg"><Briefcase className="h-4 w-4 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{ja.name}</p>
                    <p className="text-xs text-slate-500">{ja.type}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{fmtCur(ja.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Member Detail Modal */}
      {(selectedMember || loadingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            {loadingMember ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : selectedMember && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      selectedMember.is_self ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedMember.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedMember.name}</p>
                      <p className="text-sm text-slate-500">{selectedMember.relationship}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-5 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Total Value</p>
                    <p className="text-xl font-bold text-slate-900">{fmtCur(selectedMember.total_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">YTD Return</p>
                    <p className={`text-xl font-bold ${selectedMember.ytd_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      +{selectedMember.ytd_return}%
                    </p>
                  </div>
                </div>

                {/* Accounts */}
                {selectedMember.accounts && selectedMember.accounts.length > 0 && (
                  <div className="p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts</h4>
                    {selectedMember.accounts.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.name}</p>
                          <p className="text-xs text-slate-500">{a.type}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{fmtCur(a.value)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!selectedMember.is_self && (
                  <div className="px-5 pb-5">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">
                        For full account access and transaction history, {selectedMember.name} can log in with their own credentials.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
