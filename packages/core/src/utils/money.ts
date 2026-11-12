/** Splits non-negative minor units evenly; remainder units go to earlier entries. */
export function splitEqually(amountMinor: number, count: number): number[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError('amountMinor must be a non-negative safe integer.');
  if (!Number.isSafeInteger(count) || count <= 0) throw new RangeError('count must be a positive safe integer.');
  const base = Math.floor(amountMinor / count);
  const remainder = amountMinor % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Calculates a share using basis points and leaves fractional minor units with the platform. */
export function shareOf(amountMinor: number, basisPoints: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError('amountMinor must be a non-negative safe integer.');
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new RangeError('basisPoints must be an integer between 0 and 10000.');
  }
  return Number((BigInt(amountMinor) * BigInt(basisPoints)) / 10_000n);
}
