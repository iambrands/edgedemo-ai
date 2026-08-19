/**
 * AINarrativeBanner — fetches real AI-generated portfolio narrative from
 * the backend AI analysis endpoint (OpenAI gpt-4o-mini).
 *
 * Falls back gracefully to the previous string-template approach when the
 * API call is in-flight or fails.
 */
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';
import type { B2CDashboardResponse, B2CTaxSummary, B2CGoal } from '../../services/b2cApi';

interface AINarrativeBannerProps {
  dashboard: B2CDashboardResponse | null;
  taxSummary: B2CTaxSummary | null;
  goals?: B2CGoal[];
  netWorthChange?: number;
  netWorthChangePct?: number;
}

/** Deterministic fallback — shown while AI response is loading */
function buildFallbackNarrative(props: AINarrativeBannerProps): string {
  const { dashboard, taxSummary, netWorthChange, netWorthChangePct } = props;
  if (!dashboard) return '';
  const parts: string[] = [];

  if (netWorthChange != null && netWorthChangePct != null) {
    const dir = netWorthChange >= 0 ? 'grew' : 'declined';
    const fmt = Math.abs(netWorthChange) >= 1000
      ? `$${(Math.abs(netWorthChange) / 1000).toFixed(0)}K`
      : `$${Math.abs(netWorthChange).toFixed(0)}`;
    parts.push(`Your net worth ${dir} by ${fmt} (${Math.abs(netWorthChangePct).toFixed(1)}%) over the past 12 months.`);
  }

  const feeSavings = dashboard.fee_impact_summary?.potential_savings;
  if (feeSavings && Number(feeSavings) > 0) {
    const savings = Number(feeSavings);
    parts.push(`Your fee analyzer identified $${(savings / 1000).toFixed(1)}K/year in potential savings vs. a traditional advisor.`);
  }

  if (taxSummary && taxSummary.tlh_estimated_savings > 0) {
    const tlh = `$${(taxSummary.tlh_estimated_savings / 1000).toFixed(1)}K`;
    parts.push(`${taxSummary.tlh_opportunities} tax-loss harvesting opportunities could save ~${tlh} this year.`);
  }

  return parts.slice(0, 2).join(' ');
}

export function AINarrativeBanner(props: AINarrativeBannerProps) {
  const [narrative, setNarrative] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<string>('');
  const fetched = useRef(false);

  // Set fallback immediately so the banner isn't blank during load
  useEffect(() => {
    const fallback = buildFallbackNarrative(props);
    if (fallback) setNarrative(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.dashboard]);

  // Fetch real AI analysis
  useEffect(() => {
    if (fetched.current || !props.dashboard) return;
    fetched.current = true;

    b2cApi.getAIAnalysis()
      .then((res) => {
        if (res.narrative) {
          setNarrative(res.narrative);
          setModel(res.model);
        }
      })
      .catch(() => {
        // Keep fallback — no error shown to user
      })
      .finally(() => setLoading(false));
  }, [props.dashboard]);

  if (!narrative && !loading) return null;

  const isRealAI = model && model !== 'fallback';

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI Summary</p>
            {isRealAI && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                {model}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{narrative}</p>
        </div>
      </div>
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
