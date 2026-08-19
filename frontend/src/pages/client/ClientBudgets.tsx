import { useEffect, useState } from 'react';
import {
  Car,
  Coffee,
  Heart,
  HelpCircle,
  Monitor,
  Music,
  Package,
  ShoppingCart,
  Sparkles,
  Target,
  ToggleLeft,
  ToggleRight,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CBudget } from '../../services/b2cApi';

/* ── category config ─────────────────────────────────────────────────── */

interface CatCfg { Icon: LucideIcon; iconBg: string; iconColor: string; }

const CAT_CFG: Record<string, CatCfg> = {
  groceries:    { Icon: ShoppingCart, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  dining:       { Icon: Coffee,       iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
  transport:    { Icon: Car,          iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
  entertainment:{ Icon: Music,        iconBg: 'bg-purple-100',  iconColor: 'text-purple-600' },
  shopping:     { Icon: Package,      iconBg: 'bg-rose-100',    iconColor: 'text-rose-600' },
  utilities:    { Icon: Monitor,      iconBg: 'bg-slate-100',   iconColor: 'text-slate-600' },
  health:       { Icon: Heart,        iconBg: 'bg-teal-100',    iconColor: 'text-teal-600' },
};
function getCfg(cat: string): CatCfg {
  return CAT_CFG[cat] ?? { Icon: HelpCircle, iconBg: 'bg-slate-100', iconColor: 'text-slate-500' };
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function statusLabel(status: B2CBudget['status']) {
  if (status === 'over') return { text: 'Over budget', cls: 'text-red-600 bg-red-50 border-red-200' };
  if (status === 'warning') return { text: 'Nearing limit', cls: 'text-amber-600 bg-amber-50 border-amber-200' };
  return { text: 'On track', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
}

/* pace: what fraction of the month has elapsed */
function getMonthPacePct(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (now.getDate() / daysInMonth) * 100;
}

/* ── Set budget modal ─────────────────────────────────────────────────── */

function SetBudgetModal({ budget, onSave, onClose }: { budget: B2CBudget; onSave: (cat: string, limit: number) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState(String(Math.round(budget.monthly_limit)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { Icon, iconBg, iconColor } = getCfg(budget.category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) { setError('Enter a valid positive amount.'); return; }
    setSaving(true); setError('');
    try { await onSave(budget.category, limit); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save budget.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}><Icon className={`h-5 w-5 ${iconColor}`} /></div>
            <div><h2 className="font-semibold text-slate-900">{budget.label}</h2><p className="text-xs text-slate-500">Set monthly budget</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Monthly limit
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" min="0" step="1" required value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Current spend this month: {fmt(budget.current_spend)}</p>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Budget card ─────────────────────────────────────────────────────── */

function BudgetCard({
  budget,
  monthPacePct,
  onEdit,
  rollover,
  onToggleRollover,
  rolloverBalance,
}: {
  budget: B2CBudget;
  monthPacePct: number;
  onEdit: (b: B2CBudget) => void;
  rollover: boolean;
  onToggleRollover: (cat: string) => void;
  rolloverBalance: number;
}) {
  const { Icon, iconBg, iconColor } = getCfg(budget.category);
  const effectiveLimit = budget.monthly_limit + (rollover ? rolloverBalance : 0);
  const sl = statusLabel(budget.status);
  const barWidth = Math.min((budget.current_spend / effectiveLimit) * 100, 100);
  const barCls = budget.current_spend > effectiveLimit ? 'bg-red-500' : barWidth >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  const projectedMonthEnd = monthPacePct > 0 ? (budget.current_spend / (monthPacePct / 100)) : budget.current_spend;
  const projectedOverrun = projectedMonthEnd - effectiveLimit;
  const isPacingOver = projectedOverrun > 0 && budget.current_spend <= effectiveLimit;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}><Icon className={`h-4 w-4 ${iconColor}`} /></div>
          <span className="font-medium text-slate-800 text-sm truncate">{budget.label}</span>
        </div>
        <span className={`text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full border ${sl.cls}`}>{sl.text}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 tabular-nums font-medium">{fmt(budget.current_spend)}</span>
          <span className="text-slate-400 tabular-nums">
            of {fmt(effectiveLimit)}
            {rollover && rolloverBalance > 0 && (
              <span className="ml-1 text-emerald-600 font-medium">(+{fmt(rolloverBalance)} rollover)</span>
            )}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.max(barWidth, budget.current_spend > 0 ? 3 : 0)}%` }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400/60" style={{ left: `${Math.min(monthPacePct, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{((budget.current_spend / effectiveLimit) * 100).toFixed(0)}% used</span>
          <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{Math.round(monthPacePct)}% through month</span>
        </div>
      </div>

      {isPacingOver && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
          <Sparkles className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700">
            At this pace you&apos;ll hit <strong>{fmt(projectedMonthEnd)}</strong> by month-end —
            <strong> {fmt(projectedOverrun)}</strong> over budget.
          </p>
        </div>
      )}

      {/* Rollover toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div>
          <button type="button" onClick={() => onToggleRollover(budget.category)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors">
            {rollover
              ? <ToggleRight size={16} className="text-emerald-500" />
              : <ToggleLeft size={16} className="text-slate-400" />}
            <span className={rollover ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
              {rollover ? 'Rollover on' : 'Rollover off'}
            </span>
          </button>
          {rollover && (
            <p className="text-[10px] text-slate-400 ml-5 mt-0.5">
              Unused budget carries to next month
            </p>
          )}
        </div>
        <button type="button" onClick={() => onEdit(budget)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
          Set limit
        </button>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export default function ClientBudgets() {
  const [budgets, setBudgets] = useState<B2CBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<B2CBudget | null>(null);
  // rolloverSettings: category → boolean (is rollover enabled)
  const [rolloverSettings, setRolloverSettings] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('firmum_rollover_settings') ?? '{}'); }
    catch { return {}; }
  });

  const monthPacePct = getMonthPacePct();

  useEffect(() => {
    setIsLoading(true);
    b2cApi.getBudgets()
      .then((data) => setBudgets(data.budgets))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load budgets'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (category: string, monthlyLimit: number) => {
    const updated = await b2cApi.setBudget(category, monthlyLimit);
    setBudgets((prev) => prev.map((b) => (b.category === category ? updated : b)));
  };

  const toggleRollover = (category: string) => {
    setRolloverSettings((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      localStorage.setItem('firmum_rollover_settings', JSON.stringify(next));
      return next;
    });
  };

  /* simulate a 10% rollover balance from last month for demo */
  const getRolloverBalance = (budget: B2CBudget): number => {
    if (!rolloverSettings[budget.category]) return 0;
    const unused = Math.max(0, budget.monthly_limit - budget.current_spend * 0.85);
    return Math.round(unused * 0.1 * 100) / 100;
  };

  const overCount = budgets.filter((b) => b.status === 'over').length;
  const onTrackCount = budgets.filter((b) => b.status === 'ok').length;
  const totalSpend = budgets.reduce((s, b) => s + b.current_spend, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const overallPct = totalLimit > 0 ? (totalSpend / totalLimit) * 100 : 0;
  const rolloverCount = Object.values(rolloverSettings).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><Target className="h-5 w-5 text-white" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Budgets</h1>
          <p className="text-xs text-slate-500">Monthly limits · {Math.round(monthPacePct)}% through {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}{rolloverCount > 0 ? ` · ${rolloverCount} rollover${rolloverCount > 1 ? 's' : ''} active` : ''}</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── summary hero ─────────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">Total spent</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(totalSpend)}</p>
                <p className="text-xs text-blue-200 mt-0.5">of {fmt(totalLimit)} total budget</p>
              </div>
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">On track</p>
                <p className="text-2xl font-bold mt-1">{onTrackCount}/{budgets.length}</p>
                <p className="text-xs text-blue-200 mt-0.5">categories</p>
              </div>
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">Budget used</p>
                <p className="text-2xl font-bold mt-1">{overallPct.toFixed(0)}%</p>
                <p className={`text-xs mt-0.5 ${overCount > 0 ? 'text-red-300' : 'text-blue-200'}`}>
                  {overCount > 0 ? `${overCount} over limit` : 'all within limits'}
                </p>
              </div>
            </div>
          </div>

          {/* rollover info banner */}
          {rolloverCount === 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex gap-2">
              <ToggleLeft size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                <strong>Tip:</strong> Enable <em>Rollover</em> on any budget to carry unused amounts into next month — great for irregular spending like clothing or travel.
              </p>
            </div>
          )}

          {/* ── budget cards grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgets.map((b) => (
              <BudgetCard
                key={b.category}
                budget={b}
                monthPacePct={monthPacePct}
                onEdit={setEditing}
                rollover={rolloverSettings[b.category] ?? false}
                onToggleRollover={toggleRollover}
                rolloverBalance={getRolloverBalance(b)}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            The vertical pace marker shows where spend should be at {Math.round(monthPacePct)}% through the month.
          </p>
        </>
      )}

      {editing && <SetBudgetModal budget={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </div>
  );
}
