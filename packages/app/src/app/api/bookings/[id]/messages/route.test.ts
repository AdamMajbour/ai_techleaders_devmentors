/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../../../core/src/config/env';
import { SESSION_COOKIE, signSession } from '../../../../../../../core/src/security/session';
import { NotFoundError } from '../../../../../../../core/src/http/errors';

const messageService = {
  list: jest.fn(async () => ({ items: [], nextCursor: null, pollCursor: null, serverTime: '2026-11-06T12:10:00.000Z', viewerId: 'seeker-id', session: { startsAt: '2026-11-06T12:00:00.000Z', endsAt: '2026-11-06T12:25:00.000Z' } })),
  post: jest.fn(async () => ({ id: 'message-id' })),
};
const cradle = { messageService } as unknown as Cradle;
const withScope = jest.fn(async (fn: (scope: Cradle) => Promise<unknown>) => fn(cradle));
jest.mock('../../../../../../../core/src/container/container', () => ({
  ...jest.requireActual('../../../../../../../core/src/container/container'),
  withScope: (fn: (scope: Cradle) => Promise<unknown>) => withScope(fn),
}));

import { GET, POST } from './route';

const secret = 'm'.repeat(48);
const id = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const context = { params: Promise.resolve({ id }) };

async function cookie(userId = 'seeker-id') {
  return `${SESSION_COOKIE}=${await signSession(userId, secret)}`;
}

beforeEach(() => {
  process.env.JWT_SECRET = secret;
  resetEnvCache();
  messageService.list.mockClear();
  messageService.post.mockClear();
});

describe('booking message routes', () => {
  it.each(['seeker-id', 'mentor-id'])('allows authenticated participant %s to read with session window metadata', async (userId) => {
    const response = await GET(new Request(`http://localhost/api/bookings/${id}/messages?after=cursor`, { headers: { cookie: await cookie(userId) } }), context);
    expect(response.status).toBe(200);
    expect(messageService.list).toHaveBeenCalledWith({ userId }, id, 'cursor');
    expect((await response.json() as { data: { session: { endsAt: string } } }).data.session.endsAt).toBe('2026-11-06T12:25:00.000Z');
  });

  it('requires a session and conceals service authorization failures', async () => {
    expect((await GET(new Request(`http://localhost/api/bookings/${id}/messages`), context)).status).toBe(401);
    messageService.list.mockRejectedValueOnce(new NotFoundError());
    expect((await GET(new Request(`http://localhost/api/bookings/${id}/messages`, { headers: { cookie: await cookie('outsider') } }), context)).status).toBe(404);
  });

  it('posts with session and CSRF protection and returns validation/service errors in the envelope', async () => {
    const headers = { cookie: await cookie(), origin: 'http://localhost', host: 'localhost', 'x-requested-with': 'devmentor', 'content-type': 'application/json' };
    const response = await POST(new Request(`http://localhost/api/bookings/${id}/messages`, { method: 'POST', headers, body: JSON.stringify({ body: 'hello' }) }), context);
    expect(response.status).toBe(200);
    expect(messageService.post).toHaveBeenCalledWith({ userId: 'seeker-id' }, id, 'hello');
    expect((await POST(new Request(`http://localhost/api/bookings/${id}/messages`, { method: 'POST', headers, body: JSON.stringify({ body: '' }) }), context)).status).toBe(400);
    expect((await POST(new Request(`http://localhost/api/bookings/${id}/messages`, { method: 'POST', headers: { ...headers, 'x-requested-with': 'other' }, body: JSON.stringify({ body: 'hello' }) }), context)).status).toBe(403);
  });
});
