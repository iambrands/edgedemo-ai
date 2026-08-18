import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  GraduationCap,
  Home,
  Landmark,
  Plane,
  Plus,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CGoal, type B2CGoalCreateRequest } from '../../services/b2cApi';

/* ── helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

/* ── goal type config ─────────────────────────────────────────────────── */

interface GoalTypeCfg {
  icon: LucideIcon;
  label: string;
  iconCls: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeCfg> = {
  retirement:     { icon: Landmark,      label: 'Retirement',     iconCls: 'bg-blue-50 text-blue-600' },
  education:      { icon: GraduationCap, label: 'Education',      iconCls: 'bg-purple-50 text-purple-600' },
  home_purchase:  { icon: Home,          label: 'Home Purchase',  iconCls: 'bg-emerald-50 text-emerald-600' },
  emergency_fund: { icon: ShieldCheck,   label: 'Emergency Fund', iconCls: 'bg-amber-50 text-amber-600' },
  vacation:       { icon: Plane,         label: 'Travel',         iconCls: 'bg-cyan-50 text-cyan-600' },
  custom:         { icon: Star,          label: 'Custom',         iconCls: 'bg-slate-50 text-slate-500' },
};

function getCfg(type: string): GoalTypeCfg {
  return GOAL_TYPE_CONFIG[type] ?? GOAL_TYPE_CONFIG.custom;
}

/* ── GoalCard ─────────────────────────────────────────────────────────── */

function GoalCard({
  goal,
  onDelete,
}: {
  goal: B2CGoal;
  onDelete: (id: string) => void;
}) {
  const cfg = getCfg(goal.goal_type);
  const Icon = cfg.icon;
  const pct = Math.min(goal.progress_pct, 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + title + badge */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconCls}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-sm">{goal.name}</h3>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  goal.on_track
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {goal.on_track ? (
                  <><CheckCircle className="h-3 w-3" /> On track</>
                ) : (
                  <><AlertCircle className="h-3 w-3" /> Behind</>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {cfg.label} · Target {formatMonth(goal.target_date)}
            </p>
          </div>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          aria-label={`Delete goal ${goal.name}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <div>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-sm text-slate-500 ml-1">
              of {formatCurrency(goal.target_amount)}
            </span>
          </div>
          <span
            className={`text-sm font-semibold ${
              goal.on_track ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goal.on_track ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      {goal.monthly_contribution != null && (
        <p className="mt-3 text-xs text-slate-500">
          Monthly contribution: {formatCurrency(goal.monthly_contribution)}
        </p>
      )}
      {goal.notes && (
        <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
          {goal.notes}
        </p>
      )}
    </div>
  );
}

/* ── blank form ───────────────────────────────────────────────────────── */

const BLANK: B2CGoalCreateRequest = {
  goal_type: 'retirement',
  name: '',
  target_amount: 0,
  target_date: '',
};

/* ── main component ───────────────────────────────────────────────────── */

export default function ClientGoals() {
  const [goals, setGoals] = useState<B2CGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<B2CGoalCreateRequest>(BLANK);

  useEffect(() => {
    b2cApi
      .getGoals()
      .then((res) => setGoals(res.goals))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  const handleDelete = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    b2cApi.deleteGoal(id).catch(console.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const created = await b2cApi.createGoal(form);
      setGoals((prev) => [...prev, created]);
      setShowModal(false);
      setForm(BLANK);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track progress toward your financial objectives.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add goal</span>
        </button>
      </div>

      {/* ── empty state ─────────────────────────────────────────────── */}
      {goals.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No goals yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
            Set a financial goal to start tracking your progress toward what matters most.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create first goal
          </button>
        </div>
      )}

      {/* ── goal cards ──────────────────────────────────────────────── */}
      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* ── create goal modal ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New goal</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {formError}
                </div>
              )}

              {/* Goal type picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Goal type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(GOAL_TYPE_CONFIG).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, goal_type: type }))}
                        className={`flex flex-col items-center gap-1.5 p-2.5 border rounded-lg text-xs font-medium transition-all ${
                          form.goal_type === type
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Goal name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Retire by 65"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Target amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.target_amount || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="500,000"
                    className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Target date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target date
                </label>
                <input
                  type="date"
                  required
                  value={form.target_date}
                  onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Monthly contribution (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monthly contribution{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.monthly_contribution || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        monthly_contribution: parseFloat(e.target.value) || undefined,
                      }))
                    }
                    placeholder="1,000"
                    className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Saving…' : 'Create goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
