/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../core/src/config/env';
import { SESSION_COOKIE, signSession } from '../../../../../core/src/security/session';

const mockMentorService = {
  list: jest.fn(async () => ({ items: [], page: 1, pageSize: 10, total: 0, pageCount: 1 })),
  getBySlug: jest.fn(async () => ({ id: 'profile' })),
  getById: jest.fn(async () => ({ id: 'profile' })),
  update: jest.fn(async () => ({ id: 'profile' })),
};
const mockCradle = { mentorService: mockMentorService } as unknown as Cradle;
const mockWithScope = jest.fn(async (fn: (cradle: Cradle) => Promise<unknown>) => fn(mockCradle));

jest.mock('../../../../../core/src/container/container', () => ({
  ...jest.requireActual('../../../../../core/src/container/container'),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { GET as getMentorById, PUT as updateMentor } from './[id]/route';
import { GET as getMentors } from './route';

const SECRET = 'm'.repeat(48);
const ID = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const context = { params: Promise.resolve({ id: ID }) };
const collectionContext = { params: Promise.resolve({}) };
const json = (response: Response) => response.json();

async function memberHeaders(extra: Record<string, string> = {}) {
  return {
    cookie: `${SESSION_COOKIE}=${await signSession('member-id', SECRET)}`,
    ...extra,
  };
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  resetEnvCache();
  mockMentorService.list.mockClear();
  mockMentorService.getBySlug.mockClear();
  mockMentorService.getById.mockClear();
  mockMentorService.update.mockClear();
  mockWithScope.mockClear().mockImplementation(async (fn) => fn(mockCradle));
});

describe('GET /api/mentors', () => {
  it('passes validated filter and page values to the member-only list service', async () => {
    const response = await getMentors(
      new Request('http://localhost/api/mentors?technology=TypeScript&page=2', {
        headers: await memberHeaders(),
      }),
      collectionContext,
    );

    expect(response.status).toBe(200);
    expect(mockMentorService.list).toHaveBeenCalledWith(
      { userId: 'member-id' },
      { technology: 'TypeScript', page: 2 },
    );
    expect(mockMentorService.getBySlug).not.toHaveBeenCalled();
  });

  it('resolves a slug directly so unlisted profiles remain link-accessible to members', async () => {
    const response = await getMentors(
      new Request('http://localhost/api/mentors?slug=ada-lovelace', {
        headers: await memberHeaders(),
      }),
      collectionContext,
    );

    expect(await json(response)).toEqual({ ok: true, data: { id: 'profile' } });
    expect(mockMentorService.getBySlug).toHaveBeenCalledWith({ userId: 'member-id' }, 'ada-lovelace');
    expect(mockMentorService.list).not.toHaveBeenCalled();
  });
});

describe('GET and PUT /api/mentors/[id]', () => {
  it('uses the UUID item route and rejects malformed ids', async () => {
    const response = await getMentorById(
      new Request(`http://localhost/api/mentors/${ID}`, { headers: await memberHeaders() }),
      context,
    );
    expect(await json(response)).toEqual({ ok: true, data: { id: 'profile' } });
    expect(mockMentorService.getById).toHaveBeenCalledWith({ userId: 'member-id' }, ID);

    const malformed = await getMentorById(
      new Request('http://localhost/api/mentors/not-a-uuid', { headers: await memberHeaders() }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    );
    expect(malformed.status).toBe(400);
  });

  it('validates the profile update body and delegates owner enforcement to the service', async () => {
    const headers = await memberHeaders({
      'x-requested-with': 'devmentor',
      origin: 'http://localhost',
      host: 'localhost',
      'content-type': 'application/json',
    });
    const response = await updateMentor(
      new Request(`http://localhost/api/mentors/${ID}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ headline: 'Updated', userId: 'attacker' }),
      }),
      context,
    );

    expect(await json(response)).toEqual({ ok: true, data: { id: 'profile' } });
    expect(mockMentorService.update).toHaveBeenCalledWith(
      { userId: 'member-id' },
      ID,
      { headline: 'Updated' },
    );
  });
});
