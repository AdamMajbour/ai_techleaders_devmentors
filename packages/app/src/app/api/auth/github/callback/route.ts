import { timingSafeEqual } from 'node:crypto';
import { getEnv, getOperatorUserIds, issueSessionCookie, withScope } from '@devmentor/core/server';
import { UnauthorizedError } from '@devmentor/core';

export const dynamic = 'force-dynamic';

type GithubEmail = { email?: string; primary?: boolean; verified?: boolean };
type Persona = 'mentee' | 'mentor' | 'operator';
const GITHUB_REQUEST_TIMEOUT_MS = 5_000;

function fetchGithub(input: string, init: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS) });
}

function cookieValue(request: Request, name: string): string | null {
  const pair = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1) ?? null;
}

function clearStateCookie(): string {
  return `devmentor_github_state=; Path=/api/auth/github; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

function loginRedirect(baseUrl: string, error?: string, headers?: HeadersInit, destination = '/login'): Response {
  const target = new URL(destination, baseUrl);
  if (error) target.searchParams.set('error', error);
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Location', target.toString());
  return new Response(null, { status: 303, headers: responseHeaders });
}

/** Completes OAuth only for a verified GitHub email, creating accounts only during explicit sign-up. */
export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APP_BASE_URL } = env;
  if (!APP_BASE_URL || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return loginRedirect(APP_BASE_URL ?? new URL(request.url).origin, 'github_unavailable');
  }
  const url = new URL(request.url);
  const returnedState = url.searchParams.get('state') ?? '';
  const [storedNonce = '', requestedPersona = 'auto', requestedMode = 'login'] = (cookieValue(request, 'devmentor_github_state') ?? '').split('.');
  const validState = returnedState.length === storedNonce.length && returnedState.length > 0 && timingSafeEqual(Buffer.from(returnedState), Buffer.from(storedNonce));
  const code = url.searchParams.get('code');
  if (!validState || !code) {
    return loginRedirect(APP_BASE_URL, 'github_failed', { 'Set-Cookie': clearStateCookie() });
  }

  const callback = new URL('/api/auth/github/callback', APP_BASE_URL).toString();
  let tokenResponse: Response;
  try {
    tokenResponse = await fetchGithub('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code, redirect_uri: callback }),
      cache: 'no-store',
    });
  } catch {
    return loginRedirect(APP_BASE_URL, 'github_failed', { 'Set-Cookie': clearStateCookie() });
  }
  const token = tokenResponse.ok ? (await tokenResponse.json() as { access_token?: string }).access_token : undefined;
  if (!token) {
    return loginRedirect(APP_BASE_URL, 'github_failed', { 'Set-Cookie': clearStateCookie() });
  }

  let profileResponse: Response;
  let emailsResponse: Response;
  try {
    [profileResponse, emailsResponse] = await Promise.all([
      fetchGithub('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' }),
      fetchGithub('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' }),
    ]);
  } catch {
    return loginRedirect(APP_BASE_URL, 'github_failed', { 'Set-Cookie': clearStateCookie() });
  }
  const profile = profileResponse.ok ? await profileResponse.json() as { name?: string | null; login?: string } : null;
  const emails = emailsResponse.ok ? await emailsResponse.json() as GithubEmail[] : [];
  const email = emails.find((item) => item.primary && item.verified)?.email;
  if (!profile || (!email && requestedPersona === 'auto')) {
    return loginRedirect(APP_BASE_URL, 'github_email_required', { 'Set-Cookie': clearStateCookie() });
  }

  try {
    let userId: string;
    let destination: string;
    if (requestedPersona !== 'auto') {
      if (!['mentee', 'mentor', 'operator'].includes(requestedPersona)) throw new UnauthorizedError();
      const persona = requestedPersona as Persona;
      const mapping = {
        mentee: { configuredEmail: env.DEMO_MENTEE_GITHUB_EMAIL, accountEmail: 'mock-mentee@devmentor.test' },
        mentor: { configuredEmail: env.DEMO_MENTOR_GITHUB_EMAIL, accountEmail: 'mock-mentor@devmentor.test' },
        operator: { configuredEmail: env.DEMO_OPERATOR_GITHUB_EMAIL, accountEmail: 'mock-operator@devmentor.test' },
      }[persona];
      if (!mapping.configuredEmail) {
        return loginRedirect(APP_BASE_URL, 'github_persona_not_configured', { 'Set-Cookie': clearStateCookie() });
      }
      const mappedVerifiedEmail = emails.find((item) =>
        item.verified && item.email?.trim().toLowerCase() === mapping.configuredEmail?.trim().toLowerCase(),
      )?.email;
      if (!mappedVerifiedEmail) {
        return loginRedirect(APP_BASE_URL, 'github_persona_email_mismatch', { 'Set-Cookie': clearStateCookie() });
      }
      const account = await withScope(async ({ userRepository, invitationService }) => {
        const user = await userRepository.findByEmail(mapping.accountEmail);
        if (!user) return { user: null, authorized: false };
        if (persona === 'operator') return { user, authorized: getOperatorUserIds().includes(user.id) };
        const hasRole = persona === 'mentor'
          ? await invitationService.isAcceptedMentor(user.id)
          : await invitationService.isAcceptedSeeker(user.id);
        return { user, authorized: hasRole };
      });
      if (!account.user) {
        return loginRedirect(APP_BASE_URL, 'github_demo_account_missing', { 'Set-Cookie': clearStateCookie() });
      }
      if (!account.authorized && persona === 'operator') {
        return loginRedirect(APP_BASE_URL, 'github_operator_not_enabled', { 'Set-Cookie': clearStateCookie() });
      }
      if (!account.authorized) throw new UnauthorizedError();
      userId = account.user.id;
      destination = persona === 'mentee' ? '/seeker' : persona === 'mentor' ? '/mentor' : '/operator';
    } else {
      if (!email) throw new UnauthorizedError();
      const normalizedEmail = email.trim().toLowerCase();
      const invitation = await withScope(({ invitationService }) => invitationService.findUnrevokedByEmail(normalizedEmail));
      let user;
      if (invitation) {
        user = await withScope(({ authService }) => authService.signInWithMagicLink(normalizedEmail));
        destination = invitation.role === 'mentor' ? '/mentor' : '/seeker';
      } else {
        user = await withScope(async ({ userRepository, authService }) => {
          const existing = await userRepository.findByEmail(normalizedEmail);
          if (requestedMode === 'register' && env.PUBLIC_SIGNUP) {
            return authService.registerWithGithub(normalizedEmail, profile.name ?? profile.login ?? normalizedEmail);
          }
          if (existing) return existing;
          throw new UnauthorizedError();
        });
        destination = '/seeker';
      }
      userId = user.id;
    }
    const headers = new Headers();
    headers.append('Set-Cookie', await issueSessionCookie(userId));
    headers.append('Set-Cookie', clearStateCookie());
    return loginRedirect(APP_BASE_URL, undefined, headers, destination);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    return loginRedirect(APP_BASE_URL, 'github_invitation_required', { 'Set-Cookie': clearStateCookie() });
  }
}
