import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync, useDebounce, useMediaQuery } from './index';

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
});
