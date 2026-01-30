import { useRef, useCallback } from 'react';

/**
 * Returns a callback that ignores results from stale invocations.
 * Only the most recent call's result is used (via the onResult callback).
 * Use for async operations where a slower response could overwrite a newer one.
 */
export function useLatestCallback<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => Promise<TResult>,
  onResult: (result: TResult) => void
): (...args: TArgs) => void {
  const latestCallId = useRef(0);

  return useCallback(
    (...args: TArgs) => {
      const callId = ++latestCallId.current;
      callback(...args).then((result) => {
        if (callId === latestCallId.current) {
          onResult(result);
        }
      });
    },
    [callback, onResult]
  );
}
