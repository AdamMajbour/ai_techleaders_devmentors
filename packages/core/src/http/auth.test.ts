/** @jest-environment node */
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors';
import { SESSION_COOKIE, signSession } from '../security/session';
import { getOperatorUserIds, parseOperatorUserIds, resetEnvCache } from '../config/env';
import {
  assertOwns,
  assertParticipant,
  optionalSession,
  requireOperator,
  requirePilotMember,
  requireSession,
} from './auth';

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

describe('operator access', () => {
  const original = process.env.OPERATOR_USER_IDS;
  const operatorId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    delete process.env.OPERATOR_USER_IDS;
    resetEnvCache();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = original;
    resetEnvCache();
  });

  it('parses configured UUIDs and returns no operators for empty or malformed configuration', () => {
    expect(parseOperatorUserIds(`${operatorId}, ${operatorId}`)).toEqual([operatorId]);
    expect(parseOperatorUserIds(undefined)).toEqual([]);
    expect(parseOperatorUserIds(' , ')).toEqual([]);
    expect(parseOperatorUserIds(`${operatorId},not-a-uuid`)).toEqual([]);
    expect(parseOperatorUserIds(`${operatorId},`)).toEqual([]);
  });

  it('allows only configured user ids and remains independent of JWT_SECRET', () => {
    process.env.OPERATOR_USER_IDS = operatorId;
    expect(getOperatorUserIds()).toEqual([operatorId]);
    expect(() => requireOperator({ userId: operatorId })).not.toThrow();
    expect(() => requireOperator({ userId: '00000000-0000-4000-8000-000000000002' })).toThrow(ForbiddenError);
  });

  it('fails closed without crashing when operator configuration is absent or malformed', () => {
    expect(() => requireOperator({ userId: operatorId })).toThrow(ForbiddenError);
    process.env.OPERATOR_USER_IDS = 'invalid';
    expect(() => requireOperator({ userId: operatorId })).toThrow(ForbiddenError);
  });
});

describe('assertParticipant', () => {
  it('allows an included participant and returns 404 for everyone else', () => {
    expect(() => assertParticipant({ userId: 'u1' }, ['u2', 'u1'])).not.toThrow();
    expect(() => assertParticipant({ userId: 'u1' }, ['u2'])).toThrow(NotFoundError);
    expect(() => assertParticipant({ userId: 'u1' }, [])).toThrow(NotFoundError);
  });
});

describe('requirePilotMember', () => {
  it('requires a valid session and passes the session and request to its resolver', async () => {
    const request = withCookie(await signSession('u1', SECRET));
    const resolver = jest.fn(async () => true);

    await expect(requirePilotMember(request, resolver, SECRET)).resolves.toEqual({ userId: 'u1' });
    expect(resolver).toHaveBeenCalledWith({ userId: 'u1' }, request);
  });

  it('denies by default and conceals users rejected by the resolver', async () => {
    const request = withCookie(await signSession('u1', SECRET));

    await expect(requirePilotMember(request, undefined, SECRET)).rejects.toBeInstanceOf(NotFoundError);
    await expect(requirePilotMember(request, async () => false, SECRET)).rejects.toBeInstanceOf(NotFoundError);
  });
});
