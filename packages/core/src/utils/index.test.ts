import { delay, formatDate, formatTime } from './index';

describe('formatDate', () => {
  it('formats a date in long en-US form', () => {
    expect(formatDate(new Date(2026, 9, 19))).toBe('October 19, 2026');
  });
});

describe('formatTime', () => {
  it('formats a time with two-digit hours, minutes and seconds', () => {
    expect(formatTime(new Date(2026, 9, 19, 9, 5, 7))).toMatch(/^09:05:07/);
  });
});

describe('delay', () => {
  it('resolves after the given time', async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    const pending = delay(100).then(done);

    await jest.advanceTimersByTimeAsync(99);
    expect(done).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
