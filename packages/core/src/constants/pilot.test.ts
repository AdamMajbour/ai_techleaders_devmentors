import { DEFAULT_VAULT_PREVIEW_UNTIL, isPreviewRequired } from './pilot';

describe('isPreviewRequired', () => {
  it('requires preview through the configured instant and disables it after', () => {
    const clock = { now: () => new Date('2026-12-14T23:59:59.999+01:00') };
    expect(isPreviewRequired(clock, DEFAULT_VAULT_PREVIEW_UNTIL)).toBe(true);
    expect(isPreviewRequired({ now: () => new Date('2026-12-15T00:00:00+01:00') }, DEFAULT_VAULT_PREVIEW_UNTIL)).toBe(false);
  });

  it('uses the default deadline for malformed configuration', () => {
    const clock = { now: () => new Date('2026-12-01T00:00:00Z') };
    expect(isPreviewRequired(clock, 'not-an-instant')).toBe(true);
  });
});
