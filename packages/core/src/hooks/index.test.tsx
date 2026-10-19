import { renderHook, waitFor } from '@testing-library/react';
import { useAsync } from './index';

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
