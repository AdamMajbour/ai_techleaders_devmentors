/** @jest-environment node */
import { z } from 'zod';
import { SESSION_COOKIE, signSession } from '../security/session';
import { resetEnvCache } from '../config/env';
import type { Cradle } from '../container/cradle';

const SECRET = 'm'.repeat(48);
const cradle = { marker: 'scope' } as unknown as Cradle;
const withScope = jest.fn(async (fn: (c: Cradle) => Promise<unknown>) => fn(cradle));

jest.mock('../container/container', () => ({ withScope: (fn: never) => withScope(fn) }));

import { makeActionRoute } from './makeActionRoute';
import { ConflictError } from './errors';

const ID = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const idContext = { params: Promise.resolve({ id: ID }) };
const CLIENT = { 'x-requested-with': 'devmentor' };

async function cookie() {
  return { cookie: `${SESSION_COOKIE}=${await signSession('u1', SECRET)}` };
}

const json = (response: Response) => response.json();

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  resetEnvCache();
  withScope.mockClear();
});

function routeWith(
  handler: (id: string, body: { decision: string }) => Promise<unknown> = jest.fn(
    async (id: string, body: { decision: string }) => ({ id, ...body }),
  ),
) {
  const route = makeActionRoute({
    body: z.object({ decision: z.string().min(1) }),
    handler,
  });
  return { route, handler };
}

describe('makeActionRoute', () => {
  it('runs a validated action in a DI scope for an authenticated client', async () => {
    const { route, handler } = routeWith();
    const request = new Request(`http://x/api/things/${ID}/approve`, {
      method: 'POST',
      headers: { ...CLIENT, ...(await cookie()), 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' }),
    });

    const response = await route.POST(request, idContext);

    expect(await json(response)).toEqual({ ok: true, data: { id: ID, decision: 'approved' } });
    expect(handler).toHaveBeenCalledWith(ID, { decision: 'approved' }, { cradle, session: { userId: 'u1' } });
    expect(withScope).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing CSRF header before session, id, or handler work', async () => {
    const { route, handler } = routeWith();
    const request = new Request('http://x', { method: 'POST', body: 'not json' });

    expect((await route.POST(request, { params: Promise.resolve({ id: 'bad' }) })).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(withScope).not.toHaveBeenCalled();
  });

  it('requires a session before validating the id or body', async () => {
    const { route, handler } = routeWith();
    const request = new Request('http://x', {
      method: 'POST',
      headers: CLIENT,
      body: 'not json',
    });

    expect((await route.POST(request, { params: Promise.resolve({ id: 'bad' }) })).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects malformed ids and bodies without calling the handler', async () => {
    const { route, handler } = routeWith();
    const headers = { ...CLIENT, ...(await cookie()) };
    const post = (body: string, id = ID) =>
      route.POST(new Request('http://x', { method: 'POST', headers, body }), {
        params: Promise.resolve({ id }),
      });

    const malformedId = await post('{"decision":"approved"}', 'not-a-uuid');
    const malformedBody = await post('{"decision":""}');
    const invalidJson = await post('not json');

    expect(malformedId.status).toBe(400);
    expect(malformedBody.status).toBe(400);
    expect((await json(malformedBody)).error.fieldErrors).toHaveProperty('decision');
    expect(invalidJson.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    expect(withScope).not.toHaveBeenCalled();
  });

  it('maps handler errors through the API error envelope', async () => {
    const { route, handler } = routeWith(jest.fn(async () => {
      throw new ConflictError('Already decided.');
    }));
    const request = new Request('http://x', {
      method: 'POST',
      headers: { ...CLIENT, ...(await cookie()) },
      body: '{"decision":"approved"}',
    });

    const response = await route.POST(request, idContext);

    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({
      ok: false,
      error: { code: 'conflict', message: 'Already decided.' },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
