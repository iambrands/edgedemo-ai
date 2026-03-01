import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Shared data fetching hook that eliminates the repeated
 * useState(null) + useState(true) + useState(null) + useEffect + try/catch
 * pattern found across 20+ pages.
 *
 * @example
 * const { data: households, loading, error, refetch } = useApiData(
 *   () => householdsApi.list()
 * );
 *
 * @example
 * // With dependencies that trigger re-fetch
 * const { data, loading } = useApiData(
 *   () => analysisApi.get(householdId),
 *   [householdId]
 * );
 */
export function useApiData<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
