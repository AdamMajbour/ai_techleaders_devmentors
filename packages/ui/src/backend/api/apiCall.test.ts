/** @jest-environment node */
import { ApiCallError, apiCall, apiCallOrThrow, readJsonSafe } from './apiCall';

// A body can be read once, so a Response is built per call from this factory.
function mockFetch(response: (() => Response) | Response | Error) {
  const fetchMock = jest.fn(async () => {
    if (response instanceof Error) throw response;
    return typeof response === 'function' ? response() : response;
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const envelope = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('apiCall', () => {
  it('returns the data of a success envelope', async () => {
    mockFetch(envelope({ ok: true, data: { id: 1 } }));

    expect(await apiCall<{ id: number }>('/api/things')).toEqual({ ok: true, status: 200, data: { id: 1 } });
  });

  it('returns the error and field errors of an error envelope', async () => {
    mockFetch(
      envelope({ ok: false, error: { code: 'validation_failed', message: 'bad', fieldErrors: { email: ['required'] } } }, 400),
    );

    expect(await apiCall('/api/things')).toEqual({
      ok: false,
      status: 400,
      error: { code: 'validation_failed', message: 'bad', fieldErrors: { email: ['required'] } },
    });
  });

  it('treats a non-JSON body (e.g. a proxy error page) as an invalid response, without throwing', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }));

    expect(await apiCall('/api/things')).toEqual({
      ok: false,
      status: 502,
      error: { code: 'invalid_response', message: 'The server answered with an unexpected response (HTTP 502).' },
    });
  });

  it('does not trust a 200 whose body is not an envelope', async () => {
    mockFetch(envelope({ something: 'else' }));

    expect(await apiCall('/api/things')).toMatchObject({ ok: false, error: { code: 'invalid_response' } });
  });

  it('reports a network failure as a result instead of throwing', async () => {
    mockFetch(new TypeError('fetch failed'));

    expect(await apiCall('/api/things')).toEqual({
      ok: false,
      status: 0,
      error: { code: 'network_error', message: 'The server could not be reached.' },
    });
  });

  it('always sends the client header and serializes a json body', async () => {
    const fetchMock = mockFetch(envelope({ ok: true, data: null }));

    await apiCall('/api/things', { method: 'POST', json: { name: 'x' } });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ 'x-requested-with': 'devmentor', 'content-type': 'application/json' });
    expect(init.body).toBe('{"name":"x"}');
    expect(init.method).toBe('POST');
  });
});

describe('apiCallOrThrow', () => {
  it('returns the data directly', async () => {
    mockFetch(envelope({ ok: true, data: 'hello' }));

    expect(await apiCallOrThrow<string>('/api/things')).toBe('hello');
  });

  it('throws an ApiCallError carrying the parsed error', async () => {
    mockFetch(() => envelope({ ok: false, error: { code: 'not_found', message: 'Nope' } }, 404));

    await expect(apiCallOrThrow('/api/things')).rejects.toMatchObject({
      name: 'ApiCallError',
      status: 404,
      error: { code: 'not_found' },
    });
    await expect(apiCallOrThrow('/api/things')).rejects.toBeInstanceOf(ApiCallError);
  });
});

describe('readJsonSafe', () => {
  it('returns null for an empty or invalid body and the value for valid JSON', async () => {
    expect(await readJsonSafe(new Response(''))).toBeNull();
    expect(await readJsonSafe(new Response('{oops'))).toBeNull();
    expect(await readJsonSafe(new Response('{"a":1}'))).toEqual({ a: 1 });
  });
});
