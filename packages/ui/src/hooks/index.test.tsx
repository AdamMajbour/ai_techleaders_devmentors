import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync, useDebounce, useMediaQuery, usePolling } from './index';

describe('useDebounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the new value only after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });
});

describe('useMediaQuery', () => {
  type Listener = () => void;

  function mockMatchMedia(initial: boolean) {
    let matches = initial;
    const listeners = new Set<Listener>();
    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    }));
    return {
      set(next: boolean) {
        matches = next;
        listeners.forEach((listener) => listener());
      },
      listenerCount: () => listeners.size,
    };
  }

  it('reflects the current match and updates when it changes', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('stops listening on unmount', () => {
    const media = mockMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(media.listenerCount()).toBe(1);

    unmount();
    expect(media.listenerCount()).toBe(0);
  });
});

describe('usePolling', () => {
  let visibilityDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  });

  afterEach(() => {
    jest.useRealTimers();
    if (visibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    } else {
      Reflect.deleteProperty(document, 'visibilityState');
    }
  });

  function setVisibility(visibility: DocumentVisibilityState) {
    act(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: visibility });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  async function flushPromises() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('pauses scheduled polling while the document is hidden', async () => {
    setVisibility('visible');
    const fetcher = jest.fn().mockResolvedValue({ value: 1 });
    renderHook(() => usePolling({ fetcher, intervalMs: 100, cursor: null }));
    await flushPromises();
    expect(fetcher).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    act(() => jest.advanceTimersByTime(500));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fetches immediately when visibility returns', async () => {
    setVisibility('hidden');
    const fetcher = jest.fn().mockResolvedValue({ value: 1 });
    renderHook(() => usePolling({ fetcher, intervalMs: 100, cursor: null }));
    expect(fetcher).not.toHaveBeenCalled();

    setVisibility('visible');
    await flushPromises();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('backs off after errors and resumes the normal interval after success', async () => {
    setVisibility('visible');
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => usePolling({ fetcher, intervalMs: 100, cursor: null }));
    await flushPromises();
    expect(result.current.status).toBe('error');

    act(() => jest.advanceTimersByTime(199));
    expect(fetcher).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(1));
    await flushPromises();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');

    act(() => jest.advanceTimersByTime(100));
    await flushPromises();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('stops polling when a result marks the operation terminal', async () => {
    setVisibility('visible');
    const fetcher = jest.fn().mockResolvedValue({ value: 1, terminal: true });
    const { result } = renderHook(() => usePolling({ fetcher, intervalMs: 100, cursor: null }));
    await flushPromises();
    expect(result.current.terminal).toBe(true);

    act(() => jest.advanceTimersByTime(1_000));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('passes the current cursor and immediately fetches when it changes', async () => {
    setVisibility('visible');
    const fetcher = jest.fn((cursor: string) => Promise.resolve({ cursor }));
    const { result, rerender } = renderHook(
      ({ cursor }) => usePolling({ fetcher, intervalMs: 100, cursor }),
      { initialProps: { cursor: 'first' } },
    );
    await flushPromises();
    expect(fetcher).toHaveBeenLastCalledWith('first');
    expect(result.current.data).toEqual({ cursor: 'first' });

    rerender({ cursor: 'next' });
    await flushPromises();
    expect(fetcher).toHaveBeenLastCalledWith('next');
    expect(result.current.data).toEqual({ cursor: 'next' });
  });
});

describe('useAsync', () => {
  it('goes from pending to success with the resolved data', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42)));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe(42);
  });

  it('reports the error when the promise rejects', async () => {
    const failure = new Error('boom');
    const { result } = renderHook(() => useAsync(() => Promise.reject(failure)));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(failure);
  });

  it('runs again when the dependencies change', async () => {
    const fn = jest.fn((value: number) => Promise.resolve(value));
    const { result, rerender } = renderHook(({ value }) => useAsync(() => fn(value), [value]), {
      initialProps: { value: 1 },
    });
    await waitFor(() => expect(result.current.data).toBe(1));

    rerender({ value: 2 });
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous data while a re-run is pending', async () => {
    let release: (value: number) => void = () => undefined;
    const fn = jest.fn((value: number) => (value === 1 ? Promise.resolve(1) : new Promise<number>((resolve) => (release = resolve))));
    const { result, rerender } = renderHook(({ value }) => useAsync(() => fn(value), [value]), { initialProps: { value: 1 } });
    await waitFor(() => expect(result.current.data).toBe(1));

    rerender({ value: 2 });
    await waitFor(() => expect(result.current.status).toBe('pending'));
    expect(result.current.data).toBe(1);

    release(2);
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('wraps a non-Error rejection in an Error', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject('plain string')));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('plain string');
  });
});
