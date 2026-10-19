'use client';

// UI-specific hooks
// Place UI interaction hooks here

import { useEffect, useState, useSyncExternalStore, type DependencyList } from 'react';

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

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data?: T;
    error?: Error;
  }>({ status: 'idle' });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setState({ status: 'pending' });
      try {
        const data = await fn();
        if (isMounted) {
          setState({ status: 'success', data });
        }
      } catch (error) {
        if (isMounted) {
          setState({ status: 'error', error: error as Error });
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
