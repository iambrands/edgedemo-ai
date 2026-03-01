/**
 * Shared formatting utilities for the EdgeAI platform.
 * Canonical source for currency, percentage, number, and date formatting.
 * All pages should import from here instead of defining local formatters.
 */

interface CurrencyOptions {
  /** Show abbreviated form ($1.2M, $450K) for large values. Default: false */
  abbreviated?: boolean;
  /** Number of decimal places. Default: 0 for values >= 1000, 2 otherwise */
  decimals?: number;
  /** Show sign (+/-) prefix. Default: false */
  showSign?: boolean;
}

/**
 * Format a number as USD currency.
 *
 * @example
 * formatCurrency(8827959)           // "$8,827,959"
 * formatCurrency(8827959, { abbreviated: true }) // "$8.83M"
 * formatCurrency(1234.56, { decimals: 2 })       // "$1,234.56"
 * formatCurrency(-500, { showSign: true })        // "-$500"
 * formatCurrency(500, { showSign: true })         // "+$500"
 */
export function formatCurrency(value: number | null | undefined, opts?: CurrencyOptions): string {
  if (value == null || isNaN(value)) return '--';

  const { abbreviated = false, decimals, showSign = false } = opts ?? {};

  if (abbreviated) {
    const abs = Math.abs(value);
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(decimals ?? 0)}`;
  }

  const maxDecimals = decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(Math.abs(value));

  if (showSign) {
    return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted.replace('-', '')}` : formatted;
  }

  return value < 0 ? `-${formatted}` : formatted;
}

interface PercentOptions {
  /** Number of decimal places. Default: 2 */
  decimals?: number;
  /** Show sign (+/-) prefix. Default: true */
  showSign?: boolean;
}

/**
 * Format a number as a percentage string.
 *
 * @example
 * formatPercent(82.67)          // "+82.67%"
 * formatPercent(-1.03)          // "-1.03%"
 * formatPercent(5.5, { decimals: 1 })  // "+5.5%"
 * formatPercent(5.5, { showSign: false }) // "5.5%"
 */
export function formatPercent(value: number | null | undefined, opts?: PercentOptions): string {
  if (value == null || isNaN(value)) return '--';
  const { decimals = 2, showSign = true } = opts ?? {};
  const sign = showSign ? (value > 0 ? '+' : '') : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a number with commas.
 *
 * @example
 * formatNumber(1234567)  // "1,234,567"
 * formatNumber(0.5, 2)   // "0.50"
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '--';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

type DateStyle = 'short' | 'medium' | 'long' | 'relative';

/**
 * Format a date string.
 *
 * @example
 * formatDate('2024-11-13')                    // "Nov 13, 2024"
 * formatDate('2024-11-13', 'short')           // "Nov 13"
 * formatDate('2024-11-13T10:30:00', 'long')   // "November 13, 2024"
 */
export function formatDate(dateStr: string | Date | null | undefined, style: DateStyle = 'medium'): string {
  if (!dateStr) return '--';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '--';

  switch (style) {
    case 'short':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'medium':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    case 'relative': {
      const now = Date.now();
      const diff = now - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
