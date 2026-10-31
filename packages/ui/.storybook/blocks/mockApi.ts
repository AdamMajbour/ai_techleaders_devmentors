// Documentation helper: replaces `fetch` for the length of one story, so a story can show every answer the API
// can give without a server. It speaks the real envelope (`{ ok, data | error }`) that apiCall parses.
// Use it as `beforeEach: apiScenario('serverError')` in a story. The previous `fetch` is restored afterwards.
export type ApiScenario = 'success' | 'pending' | 'fieldError' | 'serverError' | 'offline';

export interface ApiScenarioOptions {
  /** The `data` of a success answer. */
  data?: unknown;
  /** The field errors of a `fieldError` answer. */
  fieldErrors?: Record<string, string[]>;
  /** The message of a `serverError` answer. */
  message?: string;
}

export interface ApiCall {
  url: string;
  init?: RequestInit;
}

const JSON_HEADERS = { 'content-type': 'application/json' };

function envelope(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function installApiStub(scenario: ApiScenario, options: ApiScenarioOptions = {}) {
  const previous = globalThis.fetch;
  const calls: ApiCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    switch (scenario) {
      case 'success':
        return envelope({ ok: true, data: options.data ?? { saved: true } }, 200);
      case 'fieldError':
        return envelope(
          {
            ok: false,
            error: {
              code: 'validation_failed',
              message: 'Check the highlighted fields.',
              fieldErrors: options.fieldErrors ?? { headline: ['This headline is already used by another mentor.'] },
            },
          },
          400,
        );
      case 'serverError':
        return envelope(
          { ok: false, error: { code: 'internal_error', message: options.message ?? 'Something went wrong on our side. Try again in a minute.' } },
          500,
        );
      case 'offline':
        throw new TypeError('Failed to fetch');
      case 'pending':
        return new Promise<Response>(() => {});
    }
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = previous;
    },
  };
}

/** A story `beforeEach`: installs the stub and returns the cleanup. */
export function apiScenario(scenario: ApiScenario, options?: ApiScenarioOptions) {
  return () => installApiStub(scenario, options).restore;
}
