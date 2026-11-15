/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../../core/src/config/env';
import { SESSION_COOKIE, signSession } from '../../../../../../core/src/security/session';
import { ForbiddenError } from '../../../../../../core/src/http/errors';

const bookingService = { getById: jest.fn() };
const messageService = { list: jest.fn() };
const cradle = { bookingService, messageService } as unknown as Cradle;
const withScope = jest.fn(async (fn: (scope: Cradle) => Promise<unknown>) => fn(cradle));
jest.mock('../../../../../../core/src/container/container', () => ({
  ...jest.requireActual('../../../../../../core/src/container/container'),
  withScope: (fn: (scope: Cradle) => Promise<unknown>) => withScope(fn),
}));

import { GET } from './route';

const secret = 's'.repeat(48);
const id = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const context = { params: Promise.resolve({ id }) };
const booking = { id, status: 'accepted' };
const page = {
  items: [{ id: 'message-id', authorId: 'mentee-id', text: 'private message' }],
  serverTime: '2026-11-06T12:10:00.000Z',
  session: { startsAt: '2026-11-06T12:00:00.000Z', endsAt: '2026-11-06T12:25:00.000Z' },
};

async function cookie(userId = 'mentee-id') {
  return `${SESSION_COOKIE}=${await signSession(userId, secret)}`;
}

beforeEach(() => {
  process.env.JWT_SECRET = secret;
  resetEnvCache();
  bookingService.getById.mockReset().mockResolvedValue(booking);
  messageService.list.mockReset().mockResolvedValue(page);
});

describe('GET /api/sessions/[id]', () => {
  it('returns an open session and its messages to a participant', async () => {
    const response = await GET(new Request(`http://localhost/api/sessions/${id}`, {
      headers: { cookie: await cookie() },
    }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { ...booking, isOpen: true, messages: page.items } });
    expect(bookingService.getById).toHaveBeenCalledWith({ userId: 'mentee-id' }, id);
    expect(messageService.list).toHaveBeenCalledWith({ userId: 'mentee-id' }, id);
  });

  it('requires authentication and exposes no session data to a nonparticipant', async () => {
    expect((await GET(new Request(`http://localhost/api/sessions/${id}`), context)).status).toBe(401);
    messageService.list.mockRejectedValueOnce(new ForbiddenError());
    const response = await GET(new Request(`http://localhost/api/sessions/${id}`, {
      headers: { cookie: await cookie('operator-id') },
    }), context);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'forbidden', message: 'You are not allowed to do this.' },
    });
    expect(bookingService.getById).not.toHaveBeenCalled();
  });
});
