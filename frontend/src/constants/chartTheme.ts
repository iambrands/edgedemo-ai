/**
 * Centralized chart theme for consistent Recharts styling across all pages.
 * Import these constants instead of defining colors inline.
 */

/** Ordered categorical color palette for pie charts, bar charts, etc. */
export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // purple-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#EF4444', // red-500
  '#A855F7', // violet-500
] as const;

/** Positive / gain color */
export const CHART_POSITIVE = '#10B981'; // emerald-500

/** Negative / loss color */
export const CHART_NEGATIVE = '#EF4444'; // red-500

/** Neutral / zero color */
export const CHART_NEUTRAL = '#94A3B8'; // slate-400

/** Grid and axis color */
export const CHART_GRID = '#E2E8F0'; // slate-200

/** Axis label color */
export const CHART_AXIS_TEXT = '#64748B'; // slate-500

/** Asset class color mapping (consistent across Model Portfolios, Allocation charts, etc.) */
export const ASSET_CLASS_COLORS: Record<string, string> = {
  us_equity: '#3B82F6',
  intl_equity: '#6366F1',
  emerging_markets: '#8B5CF6',
  us_fixed_income: '#10B981',
  intl_fixed_income: '#14B8A6',
  real_estate: '#F97316',
  commodities: '#F59E0B',
  alternatives: '#EC4899',
  cash: '#94A3B8',
};

/** Shared tooltip style object for Recharts <Tooltip> contentStyle prop */
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#1E293B',
};

/** Get a color from the palette by index (wraps around) */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
