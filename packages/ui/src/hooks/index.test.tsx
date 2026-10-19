import { act, renderHook } from '@testing-library/react';
import { useDebounce, useMediaQuery } from './index';

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
