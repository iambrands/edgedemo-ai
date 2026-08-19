import { Sparkles } from 'lucide-react';
import type { B2CDashboardResponse, B2CTaxSummary } from '../../services/b2cApi';
import type { B2CGoal } from '../../services/b2cApi';

interface AINarrativeBannerProps {
  dashboard: B2CDashboardResponse | null;
  taxSummary: B2CTaxSummary | null;
  goals?: B2CGoal[];
  netWorthChange?: number;
  netWorthChangePct?: number;
}

function buildNarrative(props: AINarrativeBannerProps): string {
  const { dashboard, taxSummary, goals, netWorthChange, netWorthChangePct } = props;
  if (!dashboard) return '';

  const parts: string[] = [];

  if (netWorthChange != null && netWorthChangePct != null) {
    const dir = netWorthChange >= 0 ? 'grew' : 'declined';
    const fmt = Math.abs(netWorthChange) >= 1000
      ? `$${(Math.abs(netWorthChange) / 1000).toFixed(0)}K`
      : `$${Math.abs(netWorthChange).toFixed(0)}`;
    parts.push(
      `Your net worth ${dir} by ${fmt} (${Math.abs(netWorthChangePct).toFixed(1)}%) over the past 12 months.`,
    );
  }

  const feeSavings = dashboard.fee_impact_summary?.potential_savings;
  if (feeSavings && Number(feeSavings) > 0) {
    const savings = Number(feeSavings);
    const fmtSav = savings >= 1000 ? `$${(savings / 1000).toFixed(1)}K` : `$${savings.toFixed(0)}`;
    parts.push(`Your fee analyzer identified ${fmtSav}/year in potential savings vs. a traditional advisor.`);
  }

  if (taxSummary && taxSummary.tlh_estimated_savings > 0) {
    const tlh = taxSummary.tlh_estimated_savings >= 1000
      ? `$${(taxSummary.tlh_estimated_savings / 1000).toFixed(1)}K`
      : `$${taxSummary.tlh_estimated_savings.toFixed(0)}`;
    parts.push(`${taxSummary.tlh_opportunities} tax-loss harvesting opportunities could save ~${tlh} this year.`);
  }

  if (goals && goals.length > 0) {
    const onTrack = goals.filter((g) => g.on_track).length;
    const total = goals.length;
    if (onTrack === total) {
      parts.push(`All ${total} of your goals are on track.`);
    } else {
      parts.push(`${onTrack} of ${total} goals are on track — review the others to stay ahead.`);
    }
  }

  return parts.slice(0, 3).join(' ');
}

export function AINarrativeBanner(props: AINarrativeBannerProps) {
  const narrative = buildNarrative(props);
  if (!narrative) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">AI Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{narrative}</p>
        </div>
      </div>
      {/* Decorative gradient orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
