// React hooks for business logic
// Place reusable hooks here

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = React.useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data?: T;
    error?: Error;
  }>({ status: 'idle' });

  React.useEffect(() => {
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
  }, deps);

  return state;
}
