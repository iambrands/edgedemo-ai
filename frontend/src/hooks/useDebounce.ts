import { useState, useEffect } from 'react';

/**
 * Debounces a value - only updates after delay ms of no changes.
 * @param value - The value to debounce
 * @param delay - Milliseconds to wait (default 500ms)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
