import { formatInstant } from './index';

describe('formatInstant', () => {
  it('formats an instant as a human-readable UTC date', () => {
    expect(formatInstant('2026-11-15T23:30:00.000Z')).toBe('November 15, 2026');
  });

  it('returns explicit text for missing or invalid dates', () => {
    expect(formatInstant(null)).toBe('Date not available');
    expect(formatInstant('not-a-date')).toBe('Date not available');
  });
});
