import { formatClock, formatDate, formatDuration, formatPrice } from './format';

describe('formatPrice', () => {
  it('drops the decimals of a whole amount in the compact style', () => {
    expect(formatPrice(2500, 'PLN')).toBe('25 PLN');
    expect(formatPrice(1000, 'PLN')).toBe('10 PLN');
  });

  it('keeps two decimals when the amount is not whole', () => {
    expect(formatPrice(1250, 'PLN')).toBe('12.50 PLN');
    expect(formatPrice(5, 'PLN')).toBe('0.05 PLN');
  });

  it('always shows two decimals in the exact style, so digits line up in a table', () => {
    expect(formatPrice(2500, 'PLN', 'exact')).toBe('25.00 PLN');
    expect(formatPrice(800, 'PLN', 'exact')).toBe('8.00 PLN');
  });
});

describe('formatClock', () => {
  it('formats a 24-hour time in the given time zone', () => {
    expect(formatClock('2026-11-03T13:25:00Z', 'Europe/Warsaw')).toBe('14:25');
    expect(formatClock('2026-11-03T13:05:00Z', 'UTC')).toBe('13:05');
  });

  it('accepts a Date', () => {
    expect(formatClock(new Date('2026-11-03T09:00:00Z'), 'UTC')).toBe('09:00');
  });
});

describe('formatDate', () => {
  it('writes day, short month and year, independent of the machine zone', () => {
    expect(formatDate('2026-11-03T23:30:00Z', 'UTC')).toBe('3 Nov 2026');
    expect(formatDate('2026-11-03T23:30:00Z', 'Europe/Warsaw')).toBe('4 Nov 2026');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [80, '1 h 20 min'],
    [120, '2 h'],
  ])('%i minutes is "%s"', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });

  it('never goes below zero', () => {
    expect(formatDuration(-5)).toBe('0 min');
  });
});
