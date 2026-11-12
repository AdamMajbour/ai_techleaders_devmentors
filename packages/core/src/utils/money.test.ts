import { shareOf, splitEqually } from './money';

describe('money helpers', () => {
  it('splits evenly with remainder units assigned in input order', () => {
    expect(splitEqually(800, 3)).toEqual([267, 267, 266]);
  });

  it('preserves the split sum across the supported property range', () => {
    for (let count = 1; count <= 20; count += 1) {
      for (let amount = 0; amount <= 100_000; amount += 137) {
        const shares = splitEqually(amount, count);
        expect(shares.reduce((sum, share) => sum + share, 0)).toBe(amount);
      }
    }
  });

  it('floors a percentage share and leaves remainder to the platform', () => {
    expect(shareOf(1000, 8000)).toBe(800);
    expect(shareOf(1, 8000)).toBe(0);
  });

  it('rejects invalid amounts, counts, and basis points', () => {
    expect(() => splitEqually(-1, 1)).toThrow(RangeError);
    expect(() => splitEqually(10, 0)).toThrow(RangeError);
    expect(() => shareOf(10, 10_001)).toThrow(RangeError);
  });
});
