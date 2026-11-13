import type { Clock } from '../utils/clock';

export const DEFAULT_VAULT_PREVIEW_UNTIL = '2026-12-14T23:59:59.999+01:00';

let malformedPreviewDateWarned = false;

/** Defaults and malformed values fail closed: mentor preview remains required. */
export function isPreviewRequired(clock: Clock, configuredUntil?: string): boolean {
  const configured = configuredUntil ?? (typeof process === 'undefined' ? undefined : process.env.VAULT_PREVIEW_UNTIL);
  const configuredTimestamp = configured ? Date.parse(configured) : Number.NaN;
  let cutoff = configuredTimestamp;
  if (!Number.isFinite(cutoff)) {
    cutoff = Date.parse(DEFAULT_VAULT_PREVIEW_UNTIL);
    if (configured && !malformedPreviewDateWarned) {
      malformedPreviewDateWarned = true;
      console.warn('VAULT_PREVIEW_UNTIL is malformed; using the default preview deadline.');
    }
  }
  return clock.now().getTime() <= cutoff;
}
