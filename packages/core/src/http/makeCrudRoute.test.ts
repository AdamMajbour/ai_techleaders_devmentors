/** @jest-environment node */
import { z } from 'zod';
import { SESSION_COOKIE, signSession } from '../security/session';
import { resetEnvCache } from '../config/env';
import type { Cradle } from '../container/cradle';

const SECRET = 'm'.repeat(48);
const cradle = { marker: 'scope' } as unknown as Cradle;
const withScope = jest.fn(async (fn: (c: Cradle) => Promise<unknown>) => fn(cradle));

jest.mock('../container/container', () => ({ withScope: (fn: never) => withScope(fn) }));

import { makeCrudRoute } from './makeCrudRoute';

const ID = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const idContext = { params: Promise.resolve({ id: ID }) };
const noContext = { params: Promise.resolve({}) };
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

const routes = () => {
  const list = jest.fn(async (query: { page: number }) => ({ page: query.page }));
  const read = jest.fn(async (id: string) => ({ id }));
  const create = jest.fn(async (input: { name: string }) => ({ ...input, id: 'new' }));
  const update = jest.fn(async (id: string, input: { name: string }) => ({ id, ...input }));
  const remove = jest.fn(async (id: string) => ({ id }));
  const route = makeCrudRoute({
    list: { query: z.object({ page: z.coerce.number().default(1) }), handler: list },
    read: { handler: read },
    create: { body: z.object({ name: z.string().min(1) }), handler: create },
    update: { body: z.object({ name: z.string().min(1) }), handler: update },
    remove: { handler: remove },
  });
  return { route, list, read, create, update, remove };
};

describe('makeCrudRoute reads', () => {
  it('lists with a validated query, publicly, inside a DI scope', async () => {
    const { route, list } = routes();

    const response = await route.GET(new Request('http://x/api/things?page=2'), noContext);

    expect(await json(response)).toEqual({ ok: true, data: { page: 2 } });
    expect(list).toHaveBeenCalledWith({ page: 2 }, { cradle, session: null });
  });

  it('rejects an invalid query with field errors', async () => {
    const { route } = routes();
    const response = await route.GET(new Request('http://x/api/things?page=abc'), noContext);

    expect(response.status).toBe(400);
    expect((await json(response)).error.fieldErrors).toHaveProperty('page');
  });

  it('reads one item when the route has an id, and rejects a malformed id', async () => {
    const { route, read } = routes();

    expect(await json(await route.GET(new Request('http://x/api/things/' + ID), idContext))).toEqual({ ok: true, data: { id: ID } });
    expect(read).toHaveBeenCalledWith(ID, { cradle, session: null });

    const bad = await route.GET(new Request('http://x'), { params: Promise.resolve({ id: 'nope' }) });
    expect(bad.status).toBe(400);
  });

  it('can require a session for reads', async () => {
    const route = makeCrudRoute({ list: { query: z.object({}), handler: async () => [], requireSession: true } });
    expect((await route.GET(new Request('http://x'), noContext)).status).toBe(401);
  });
});

describe('makeCrudRoute mutations', () => {
  it('creates with 201 for a logged-in client with the client header', async () => {
    const { route, create } = routes();
    const request = new Request('http://x/api/things', {
      method: 'POST',
      headers: { ...CLIENT, ...(await cookie()), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });

    const response = await route.POST(request, noContext);

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ name: 'x' }, { cradle, session: { userId: 'u1' } });
  });

  it('runs the CSRF check before anything else', async () => {
    const { route, create } = routes();
    const request = new Request('http://x/api/things', { method: 'POST', headers: await cookie(), body: '{"name":"x"}' });

    expect((await route.POST(request, noContext)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a session for POST, PUT and DELETE (a mutation cannot be public)', async () => {
    const { route, create, update, remove } = routes();
    const headers = { ...CLIENT, 'content-type': 'application/json' };

    expect((await route.POST(new Request('http://x', { method: 'POST', headers, body: '{"name":"x"}' }), noContext)).status).toBe(401);
    expect((await route.PUT(new Request('http://x', { method: 'PUT', headers, body: '{"name":"x"}' }), idContext)).status).toBe(401);
    expect((await route.DELETE(new Request('http://x', { method: 'DELETE', headers }), idContext)).status).toBe(401);
    expect([create, update, remove].every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it('validates the body and drops undeclared fields (no mass assignment)', async () => {
    const { route, create } = routes();
    const post = async (body: string) =>
      route.POST(new Request('http://x', { method: 'POST', headers: { ...CLIENT, ...(await cookie()) }, body }), noContext);

    expect((await post('{"name":""}')).status).toBe(400);
    expect((await post('not json')).status).toBe(400);

    await post('{"name":"x","authorId":"someone-else","isAdmin":true}');
    expect(create).toHaveBeenLastCalledWith({ name: 'x' }, expect.anything());
  });

  it('updates and deletes by id for a logged-in client', async () => {
    const { route, update, remove } = routes();
    const headers = { ...CLIENT, ...(await cookie()) };

    const put = await route.PUT(new Request('http://x', { method: 'PUT', headers, body: '{"name":"y"}' }), idContext);
    const del = await route.DELETE(new Request('http://x', { method: 'DELETE', headers }), idContext);

    expect(await json(put)).toEqual({ ok: true, data: { id: ID, name: 'y' } });
    expect(await json(del)).toEqual({ ok: true, data: { id: ID } });
    expect(update).toHaveBeenCalledWith(ID, { name: 'y' }, { cradle, session: { userId: 'u1' } });
    expect(remove).toHaveBeenCalledWith(ID, { cradle, session: { userId: 'u1' } });
  });

  it('answers an operation that is not configured with a 400 instead of running anything', async () => {
    const route = makeCrudRoute({});
    expect((await route.GET(new Request('http://x'), noContext)).status).toBe(400);
    expect((await route.POST(new Request('http://x', { method: 'POST' }), noContext)).status).toBe(400);
  });
});
