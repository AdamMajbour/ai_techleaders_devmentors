'use client';

// React hooks for business logic
// Place reusable hooks here

import { useEffect, useState, type DependencyList } from 'react';

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
