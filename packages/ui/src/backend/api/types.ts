/**
 * The JSON envelope every `/api/*` route answers with. Declared here on purpose and not
 * imported from `core`: `ui` must stay independent of `core` (see the engineering standards).
 */
export type ApiFieldErrors = Record<string, string[]>;

export type ApiError = { code: string; message: string; fieldErrors?: ApiFieldErrors };

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiError };
