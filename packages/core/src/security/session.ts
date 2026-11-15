import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'devmentor_session';

/** There is no refresh-token flow in the MVP: a session simply ends after this long (known limitation). */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

const ALGORITHM = 'HS256';

export type Session = { userId: string };

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

/** Returns the session, or null for anything that is not a valid, unexpired HS256 token signed with `secret`. */
export async function verifySession(token: string, secret: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALGORITHM] });
    return typeof payload.sub === 'string' && payload.sub ? { userId: payload.sub } : null;
  } catch {
    // Expired, tampered, wrong algorithm or malformed: all mean "not logged in", never an error page.
    return null;
  }
}

/** httpOnly keeps the token away from scripts; SameSite=Lax plus the CSRF header covers state-changing requests. */
function cookie(value: string, maxAge: number, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function buildSessionCookie(token: string, secure: boolean): string {
  return cookie(token, SESSION_TTL_SECONDS, secure);
}

export function buildClearedSessionCookie(secure: boolean): string {
  return cookie('', 0, secure);
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=') || null;
  }
  return null;
}
