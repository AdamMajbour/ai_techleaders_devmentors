import { randomBytes } from 'node:crypto';
import { getEnv } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

const PERSONAS = ['mentee', 'mentor', 'operator'] as const;
const MODES = ['login', 'register'] as const;

/** Starts GitHub OAuth using a one-time state value held in a short-lived, HTTP-only cookie. */
export async function GET(request: Request): Promise<Response> {
  const { GITHUB_CLIENT_ID, APP_BASE_URL } = getEnv();
  if (!GITHUB_CLIENT_ID || !APP_BASE_URL) {
    return Response.redirect(new URL('/login?error=github_unavailable', request.url));
  }
  const state = randomBytes(32).toString('hex');
  const requestedPersona = new URL(request.url).searchParams.get('persona');
  const requestedMode = new URL(request.url).searchParams.get('mode');
  const mode = MODES.includes(requestedMode as typeof MODES[number]) ? requestedMode : 'login';
  const persona = PERSONAS.includes(requestedPersona as typeof PERSONAS[number]) ? requestedPersona : 'auto';
  const callback = new URL('/api/auth/github/callback', APP_BASE_URL);
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callback.toString());
  authorize.searchParams.set('scope', 'read:user user:email');
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `devmentor_github_state=${state}.${persona}.${mode}; Path=/api/auth/github; Max-Age=600; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    },
  });
}
