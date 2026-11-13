'use client';

// UI-specific hooks
// Place UI interaction hooks here

import { useEffect, useRef, useState, useSyncExternalStore, type DependencyList } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface UsePollingOptions<TCursor, TData> {
  fetcher: (cursor: TCursor) => Promise<TData>;
  intervalMs: number;
  cursor: TCursor;
}

export interface PollingState<TData> {
  status: 'pending' | 'success' | 'error';
  data?: TData;
  error?: Error;
  terminal: boolean;
}

function isTerminalResult(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'terminal' in value && value.terminal === true;
}

export function usePolling<TCursor, TData>({
  fetcher,
  intervalMs,
  cursor,
}: UsePollingOptions<TCursor, TData>): PollingState<TData> {
  const [state, setState] = useState<PollingState<TData>>({ status: 'pending', terminal: false });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let terminal = false;
    let consecutiveErrors = 0;
    const baseInterval = Math.max(1, intervalMs);

    const schedule = (delay: number) => {
      if (!active || terminal || document.visibilityState === 'hidden') return;
      timer = setTimeout(() => {
        timer = undefined;
        void poll();
      }, delay);
    };

    const poll = async () => {
      if (!active || terminal || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      setState((previous) => ({ status: 'pending', data: previous.data, terminal: false }));

      try {
        const data = await fetcherRef.current(cursor);
        if (!active) return;
        inFlight = false;
        consecutiveErrors = 0;
        terminal = isTerminalResult(data);
        setState({ status: 'success', data, terminal });
        if (!terminal) schedule(baseInterval);
      } catch (reason) {
        if (!active) return;
        inFlight = false;
        consecutiveErrors += 1;
        const error = reason instanceof Error ? reason : new Error(String(reason));
        setState((previous) => ({ status: 'error', data: previous.data, error, terminal: false }));
        const backoff = Math.min(baseInterval * 2 ** consecutiveErrors, 60_000);
        schedule(backoff);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      } else {
        void poll();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void poll();

    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cursor, intervalMs]);

  return state;
}

/**
 * Runs `fn` on mount and whenever `deps` change. While a re-run is pending the previous `data` is
 * kept (stale-while-revalidate), so a reload does not blank the screen.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data?: T;
    error?: Error;
  }>({ status: 'idle' });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setState((previous) => ({ status: 'pending', data: previous.data }));
      try {
        const data = await fn();
        if (isMounted) {
          setState({ status: 'success', data });
        }
      } catch (error) {
        if (isMounted) {
          setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
        }
      }
    };

    run();
    return () => {
      isMounted = false;
    };
    // Callers control re-runs through `deps`, as with useEffect itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
