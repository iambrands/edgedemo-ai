/**
 * Date/Time utility functions for consistent timezone-aware formatting
 * All timestamps from the backend are in UTC and should be converted to user's timezone
 */

// Common US timezones for the timezone selector
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

// Extended timezone list for international users
export const ALL_TIMEZONES = [
  ...COMMON_TIMEZONES,
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // Fallback
  }
}

/**
 * Format a date/time string to the user's timezone
 * @param dateInput - Date string (ISO format), Date object, or timestamp
 * @param userTimezone - IANA timezone string (e.g., 'America/Chicago')
 * @param options - Intl.DateTimeFormat options
 */
export function formatDateTime(
  dateInput: string | Date | number,
  userTimezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' 
      ? new Date(dateInput) 
      : dateInput;
    
    if (isNaN(date.getTime())) {
      return '--';
    }

    const timezone = userTimezone || getBrowserTimezone();
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options
    };

    return date.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--';
  }
}

/**
 * Format a date only (no time) to the user's timezone
 */
export function formatDate(
  dateInput: string | Date | number,
  userTimezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDateTime(dateInput, userTimezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
    second: undefined,
    ...options
  });
}

/**
 * Format time only to the user's timezone
 */
export function formatTime(
  dateInput: string | Date | number,
  userTimezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDateTime(dateInput, userTimezone, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

/**
 * Format a date as a relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatTimeAgo(
  dateInput: string | Date | number,
  userTimezone?: string
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(date.getTime())) {
      return '--';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // For older dates, show the actual date in user's timezone
      return formatDate(date, userTimezone);
    }
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return '--';
  }
}

/**
 * Format timestamp for real-time displays (e.g., "today at 3:45 PM CT")
 */
export function formatTimestamp(
  dateInput: string | Date | number,
  userTimezone?: string
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(date.getTime())) {
      return '--';
    }

    const timezone = userTimezone || getBrowserTimezone();
    const now = new Date();
    
    // Check if same day
    const dateStr = date.toLocaleDateString('en-US', { timeZone: timezone });
    const todayStr = now.toLocaleDateString('en-US', { timeZone: timezone });
    
    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    if (dateStr === todayStr) {
      return `today at ${timeStr}`;
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-US', { timeZone: timezone });
    
    if (dateStr === yesterdayStr) {
      return `yesterday at ${timeStr}`;
    }

    // Otherwise, show full date
    const fullDateStr = date.toLocaleDateString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric'
    });
    
    return `${fullDateStr} at ${timeStr}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '--';
  }
}

/**
 * Get timezone abbreviation for display
 */
export function getTimezoneAbbreviation(timezone?: string): string {
  try {
    const tz = timezone || getBrowserTimezone();
    const date = new Date();
    const parts = date.toLocaleTimeString('en-US', {
      timeZone: tz,
      timeZoneName: 'short'
    }).split(' ');
    
    return parts[parts.length - 1] || tz;
  } catch {
    return timezone || 'ET';
  }
}

/**
 * Get friendly timezone label from IANA timezone name
 */
export function getTimezoneLabel(timezone: string): string {
  const found = ALL_TIMEZONES.find(tz => tz.value === timezone);
  return found ? found.label : timezone;
}

/**
 * Check if a timezone is valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
