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
  Target,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CBudget } from '../../services/b2cApi';

/* ── category config ──────────────────────────────────────────────────────── */

interface CatCfg {
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

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

/* ── helpers ──────────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function barColor(status: B2CBudget['status']) {
  if (status === 'over') return 'bg-red-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function statusLabel(status: B2CBudget['status']) {
  if (status === 'over') return { text: 'Over budget', cls: 'text-red-600' };
  if (status === 'warning') return { text: 'Nearing limit', cls: 'text-amber-600' };
  return { text: 'On track', cls: 'text-emerald-600' };
}

/* ── set budget modal ─────────────────────────────────────────────────────── */

interface SetBudgetModalProps {
  budget: B2CBudget;
  onSave: (category: string, limit: number) => Promise<void>;
  onClose: () => void;
}

function SetBudgetModal({ budget, onSave, onClose }: SetBudgetModalProps) {
  const [value, setValue] = useState(String(Math.round(budget.monthly_limit)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { Icon, iconBg, iconColor } = getCfg(budget.category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) {
      setError('Enter a valid positive amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(budget.category, limit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{budget.label}</h2>
              <p className="text-xs text-slate-500">Set monthly budget</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Monthly limit
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Current spend this month: {fmt(budget.current_spend)}
            </p>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── budget card ──────────────────────────────────────────────────────────── */

interface BudgetCardProps {
  budget: B2CBudget;
  onEdit: (budget: B2CBudget) => void;
}

function BudgetCard({ budget, onEdit }: BudgetCardProps) {
  const { Icon, iconBg, iconColor } = getCfg(budget.category);
  const bar = barColor(budget.status);
  const sl = statusLabel(budget.status);
  const barWidth = Math.min(budget.pct, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{budget.label}</span>
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${sl.cls}`}>{sl.text}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 tabular-nums font-medium">{fmt(budget.current_spend)}</span>
          <span className="text-slate-400 tabular-nums">of {fmt(budget.monthly_limit)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${bar}`}
            style={{ width: `${Math.max(barWidth, budget.current_spend > 0 ? 3 : 0)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 tabular-nums text-right">{budget.pct.toFixed(0)}% used</p>
      </div>

      <button
        type="button"
        onClick={() => onEdit(budget)}
        className="w-full py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        Set budget
      </button>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function ClientBudgets() {
  const [budgets, setBudgets] = useState<B2CBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<B2CBudget | null>(null);

  useEffect(() => {
    setIsLoading(true);
    b2cApi
      .getBudgets()
      .then((data) => setBudgets(data.budgets))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load budgets'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (category: string, monthlyLimit: number) => {
    const updated = await b2cApi.setBudget(category, monthlyLimit);
    setBudgets((prev) => prev.map((b) => (b.category === category ? updated : b)));
  };

  const overCount = budgets.filter((b) => b.status === 'over').length;
  const onTrackCount = budgets.filter((b) => b.status === 'ok').length;
  const totalSpend = budgets.reduce((s, b) => s + b.current_spend, 0);

  return (
    <div className="space-y-5">
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Budgets</h1>
          <p className="text-xs text-slate-500">Monthly spending limits · August 2026</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── summary pills ────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700 font-medium">{onTrackCount}</span>
              <span className="text-slate-500">on track</span>
            </div>
            {overCount > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-700 font-medium">{overCount}</span>
                <span className="text-red-600">over budget</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-sm ml-auto">
              <span className="text-slate-500">Total spent:</span>
              <span className="text-slate-900 font-semibold tabular-nums">{fmt(totalSpend)}</span>
            </div>
          </div>

          {/* ── budget cards grid ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgets.map((b) => (
              <BudgetCard key={b.category} budget={b} onEdit={setEditing} />
            ))}
          </div>
        </>
      )}

      {/* ── set budget modal ─────────────────────────────────────────────── */}
      {editing && (
        <SetBudgetModal
          budget={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
