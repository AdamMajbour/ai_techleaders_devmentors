import type { FieldErrors } from './errors';

/**
 * The JSON shape of every API response. This is a shape convention, not a shared type:
 * `ui` must not import `core`, so `ui/src/backend/api` declares its own copy.
 */
export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: FieldErrors } };
