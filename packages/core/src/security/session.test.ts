/** @jest-environment node */
import { SignJWT } from 'jose';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
  signSession,
  verifySession,
} from './session';

const SECRET = 'a'.repeat(48);
const key = (secret: string) => new TextEncoder().encode(secret);

describe('session tokens', () => {
  it('round-trips the user id', async () => {
    const token = await signSession('user-1', SECRET);
    expect(await verifySession(token, SECRET)).toEqual({ userId: 'user-1' });
  });

  it('expires after 24 hours', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - SESSION_TTL_SECONDS - 60;
    const token = await signSession('user-1', SECRET, issuedAt);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    expect(await verifySession(await signSession('user-1', SECRET), 'b'.repeat(48))).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const [header, , signature] = (await signSession('user-1', SECRET)).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9_999_999_999 })).toString('base64url');
    expect(await verifySession(`${header}.${forgedPayload}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects an unsigned (alg: none) token and a different HMAC algorithm', async () => {
    const none = [
      Buffer.from('{"alg":"none"}').toString('base64url'),
      Buffer.from(JSON.stringify({ sub: 'user-1', exp: 9_999_999_999 })).toString('base64url'),
      '',
    ].join('.');
    const hs512 = await new SignJWT({}).setProtectedHeader({ alg: 'HS512' }).setSubject('user-1').setExpirationTime('1h').sign(key(SECRET));

    expect(await verifySession(none, SECRET)).toBeNull();
    expect(await verifySession(hs512, SECRET)).toBeNull();
  });

  it('rejects garbage and a token without a subject', async () => {
    const noSubject = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key(SECRET));

    expect(await verifySession('not-a-jwt', SECRET)).toBeNull();
    expect(await verifySession('', SECRET)).toBeNull();
    expect(await verifySession(noSubject, SECRET)).toBeNull();
  });
});

describe('session cookie', () => {
  it('is httpOnly, SameSite=Lax, path-scoped and expires with the token', () => {
    const cookie = buildSessionCookie('tok', false);

    expect(cookie).toContain(`${SESSION_COOKIE}=tok`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(cookie).not.toContain('Secure');
  });

  it('adds Secure in production and keeps every flag when cleared', () => {
    expect(buildSessionCookie('tok', true)).toContain('Secure');
    const cleared = buildClearedSessionCookie(true);
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('SameSite=Lax');
    expect(cleared).toContain('Secure');
  });

  it('is read from a Cookie header with other cookies around it', () => {
    const request = new Request('http://x', { headers: { cookie: `a=1; ${SESSION_COOKIE}=abc.def.ghi; b=2` } });
    expect(readSessionCookie(request)).toBe('abc.def.ghi');
    expect(readSessionCookie(new Request('http://x'))).toBeNull();
    expect(readSessionCookie(new Request('http://x', { headers: { cookie: 'a=1' } }))).toBeNull();
  });
});
