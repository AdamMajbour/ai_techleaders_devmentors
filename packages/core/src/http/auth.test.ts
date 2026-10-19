/** @jest-environment node */
import { ForbiddenError, UnauthorizedError } from './errors';
import { SESSION_COOKIE, signSession } from '../security/session';
import { resetEnvCache } from '../config/env';
import { assertOwns, optionalSession, requireSession } from './auth';

const SECRET = 'k'.repeat(48);
const withCookie = (value: string) => new Request('http://x/api', { headers: { cookie: `${SESSION_COOKIE}=${value}` } });

describe('requireSession', () => {
  it('returns the session for a valid cookie', async () => {
    expect(await requireSession(withCookie(await signSession('u1', SECRET)), SECRET)).toEqual({ userId: 'u1' });
  });

  it('throws UnauthorizedError without a cookie, with garbage, and with another secret', async () => {
    await expect(requireSession(new Request('http://x/api'), SECRET)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireSession(withCookie('garbage'), SECRET)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireSession(withCookie(await signSession('u1', 'z'.repeat(48))), SECRET)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('without a configured secret', () => {
  const original = process.env.JWT_SECRET;
  beforeEach(() => {
    delete process.env.JWT_SECRET;
    resetEnvCache();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
    resetEnvCache();
  });

  it('treats a request without a cookie as a visitor and still never reads the environment', async () => {
    expect(await optionalSession(new Request('http://x/api'))).toBeNull();
    await expect(requireSession(new Request('http://x/api'))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('fails closed (an error, not a session) when a cookie is present', async () => {
    await expect(optionalSession(withCookie('anything'))).rejects.toThrow(/JWT_SECRET/);
  });
});

describe('optionalSession', () => {
  it('is null for a visitor and the session for a logged-in user', async () => {
    expect(await optionalSession(new Request('http://x/api'), SECRET)).toBeNull();
    expect(await optionalSession(withCookie(await signSession('u1', SECRET)), SECRET)).toEqual({ userId: 'u1' });
  });
});

describe('assertOwns', () => {
  it('passes for the owner', () => {
    expect(() => assertOwns({ userId: 'u1' }, 'u1')).not.toThrow();
  });

  it('denies another user, and fails closed on a missing owner', () => {
    expect(() => assertOwns({ userId: 'u1' }, 'u2')).toThrow(ForbiddenError);
    expect(() => assertOwns({ userId: 'u1' }, undefined)).toThrow(ForbiddenError);
    expect(() => assertOwns({ userId: 'u1' }, null)).toThrow(ForbiddenError);
    expect(() => assertOwns({ userId: 'u1' }, '')).toThrow(ForbiddenError);
  });
});
