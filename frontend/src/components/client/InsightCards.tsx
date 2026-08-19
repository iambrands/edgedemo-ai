import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  DollarSign,
  PieChart,
  Target,
  AlertTriangle,
  Leaf,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CInsight, type InsightType } from '../../services/b2cApi';

// ─────────────────────────────────────────────────────────────────────────────
// Visual config per insight type
// ─────────────────────────────────────────────────────────────────────────────

interface InsightStyle {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  border: string;
  badge: string;
  badgeText: string;
}

const INSIGHT_STYLES: Record<InsightType, InsightStyle> = {
  fee_savings: {
    icon: DollarSign,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700',
    badgeText: 'Fee savings',
  },
  budget_overspend: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-700',
    badgeText: 'Budget alert',
  },
  goal_off_track: {
    icon: Target,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700',
    badgeText: 'Goal progress',
  },
  rebalance_needed: {
    icon: PieChart,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    border: 'border-violet-200',
    badge: 'bg-violet-50 text-violet-700',
    badgeText: 'Allocation',
  },
  tax_opportunity: {
    icon: Leaf,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    border: 'border-teal-200',
    badge: 'bg-teal-50 text-teal-700',
    badgeText: 'Tax opportunity',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Single card
// ─────────────────────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: B2CInsight }) {
  const style = INSIGHT_STYLES[insight.type];
  const Icon = style.icon;

  return (
    <article
      className={`bg-white rounded-xl border ${style.border} p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge} mb-1.5`}>
            {style.badgeText}
          </span>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">{insight.title}</h3>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{insight.body}</p>

      <Link
        to={insight.cta_path}
        className={`self-start inline-flex items-center gap-1.5 text-xs font-medium ${style.iconColor} hover:underline`}
      >
        {insight.cta_label}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function InsightSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-20 bg-slate-100 rounded-full" />
          <div className="h-4 w-3/4 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
      <div className="h-3 w-24 bg-slate-100 rounded" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — self-fetching section
// ─────────────────────────────────────────────────────────────────────────────

export function InsightCards() {
  const [insights, setInsights] = useState<B2CInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    b2cApi.getInsights()
      .then((res) => { if (!cancelled) setInsights(res.insights ?? []); })
      .catch(() => { /* silently suppress — insights are non-critical */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && insights.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-slate-900">Insights for you</h2>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <InsightSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}
