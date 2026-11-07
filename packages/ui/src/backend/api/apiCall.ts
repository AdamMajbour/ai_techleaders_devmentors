import type { ApiError, ApiResult } from './types';

/** Marks a request as made by our client; state-changing routes reject plain HTML form posts without it. */
const CLIENT_HEADER = { 'x-requested-with': 'devmentor' } as const;

/** Status used when no HTTP response was received at all (offline, DNS, CORS). */
const NO_RESPONSE_STATUS = 0;

type CallOptions = Omit<RequestInit, 'body' | 'signal'> & { 
  json?: unknown;
  timeout?: number;
};

/** Reads a response body as JSON without ever throwing; anything unparseable becomes `null`. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A proxy error page or a truncated body is not JSON; the caller turns null into an error result.
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toError(body: unknown, status: number): ApiError {
  if (isRecord(body) && body.ok === false && isRecord(body.error) && typeof body.error.message === 'string') {
    const { code, message, fieldErrors } = body.error;
    return {
      code: typeof code === 'string' ? code : 'unknown_error',
      message,
      fieldErrors: isRecord(fieldErrors) ? (fieldErrors as ApiError['fieldErrors']) : undefined,
    };
  }
  return { code: 'invalid_response', message: `The server answered with an unexpected response (HTTP ${status}).` };
}

/**
 * The only place a client calls `/api/*`: never use `fetch` directly in a component.
 * Always resolves to an `ApiResult`; branch on `ok` instead of try/catch.
 */
export async function apiCall<T>(path: string, options: CallOptions = {}): Promise<ApiResult<T>> {
  const { json, headers, timeout = 30000, ...init } = options;

  const controller = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: {
        ...CLIENT_HEADER,
        ...(json === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        status: NO_RESPONSE_STATUS,
        error: { code: 'timeout', message: 'Request timed out.' },
      };
    }
    return {
      ok: false,
      status: NO_RESPONSE_STATUS,
      error: { code: 'network_error', message: 'The server could not be reached.' },
    };
  }

  if (timeoutId) clearTimeout(timeoutId);

  const body = await readJsonSafe(response);
  if (response.ok && isRecord(body) && body.ok === true && 'data' in body) {
    return { ok: true, status: response.status, data: body.data as T };
  }
  return { ok: false, status: response.status, error: toError(body, response.status) };
}

/** Thrown by `apiCallOrThrow`; carries the parsed error so callers can show field errors. */
export class ApiCallError extends Error {
  constructor(
    readonly error: ApiError,
    readonly status: number,
  ) {
    super(error.message);
    this.name = 'ApiCallError';
  }
}

/** Like `apiCall`, for call sites that prefer throwing (e.g. inside data-loading hooks). */
export async function apiCallOrThrow<T>(path: string, options?: CallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiCallError(result.error, result.status);
  return result.data;
}

export type { CallOptions };
