/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../../../core/src/config/env';

const mockWithScope = jest.fn();
const mockIsAcceptedSeeker = jest.fn(async () => true);
const mockIsAcceptedMentor = jest.fn(async () => true);
const mockSignInWithMagicLink = jest.fn(async () => ({ id: 'user-1' }));
const mockCradle = {
  userRepository: { findByEmail: jest.fn(async () => ({ id: 'user-1' })) },
  invitationService: { isAcceptedSeeker: mockIsAcceptedSeeker, isAcceptedMentor: mockIsAcceptedMentor, findUnrevokedByEmail: jest.fn(async () => ({ role: 'seeker' })) },
  authService: { signInWithMagicLink: mockSignInWithMagicLink },
} as unknown as Cradle;

jest.mock('@devmentor/core/server', () => ({
  ...jest.requireActual('@devmentor/core/server'),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { GET as startGithubSignIn } from '../route';
import { GET as completeGithubSignIn } from './route';

const SECRET = 'github-test-secret-'.padEnd(48, 'x');

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.APP_BASE_URL = 'https://app.devmentor.example';
  process.env.GITHUB_CLIENT_ID = 'client-id';
  process.env.GITHUB_CLIENT_SECRET = 'client-secret';
  process.env.DEMO_MENTEE_GITHUB_EMAIL = 'ada@example.com';
  resetEnvCache();
  mockSignInWithMagicLink.mockClear();
  mockIsAcceptedSeeker.mockReset().mockResolvedValue(true);
  mockIsAcceptedMentor.mockReset().mockResolvedValue(true);
  mockWithScope.mockReset().mockImplementation((fn: (cradle: Cradle) => Promise<unknown>) => fn(mockCradle));
});

afterEach(() => jest.restoreAllMocks());

async function startFlow() {
  const start = await startGithubSignIn(new Request('https://app.devmentor.example/api/auth/github?persona=mentee'));
  const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
  const cookie = start.headers.get('set-cookie')!.split(';')[0];
  return { state, cookie };
}

function githubFetchMock(email = 'ada@example.com', verified = true) {
  return jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/access_token')) return Response.json({ access_token: 'access-token' });
    if (url.endsWith('/user')) return Response.json({ login: 'ada', name: 'Ada' });
    return Response.json([{ email, primary: true, verified }]);
  });
}

describe('GET /api/auth/github/callback', () => {
  it('rejects a mismatched OAuth state without contacting GitHub', async () => {
    const { cookie } = await startFlow();
    const fetch = githubFetchMock();
    const response = await completeGithubSignIn(new Request('https://app.devmentor.example/api/auth/github/callback?state=wrong&code=code', { headers: { cookie } }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('github_failed');
    expect(fetch).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('authenticates a verified, invited persona and issues a session cookie', async () => {
    const { state, cookie } = await startFlow();
    const fetch = githubFetchMock();
    const response = await completeGithubSignIn(new Request(`https://app.devmentor.example/api/auth/github/callback?state=${state}&code=code`, { headers: { cookie } }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://app.devmentor.example/seeker');
    expect(response.headers.get('set-cookie')).toContain('devmentor_session=');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(mockWithScope).toHaveBeenCalledTimes(1);
  });

  it('rejects a different verified GitHub e-mail mapped to the persona', async () => {
    const { state, cookie } = await startFlow();
    githubFetchMock('other@example.com');
    const response = await completeGithubSignIn(new Request(`https://app.devmentor.example/api/auth/github/callback?state=${state}&code=code`, { headers: { cookie } }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('github_persona_email_mismatch');
    expect(response.headers.get('set-cookie')).not.toContain('devmentor_session=');
  });

  it('denies a demo account that does not have the required seeker access', async () => {
    const { state, cookie } = await startFlow();
    mockIsAcceptedSeeker.mockResolvedValue(false);
    githubFetchMock();
    const response = await completeGithubSignIn(new Request(`https://app.devmentor.example/api/auth/github/callback?state=${state}&code=code`, { headers: { cookie } }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('github_invitation_required');
    expect(response.headers.get('set-cookie')).not.toContain('devmentor_session=');
  });

  it('returns the sign-in error path when GitHub does not respond before the timeout', async () => {
    const { state, cookie } = await startFlow();
    jest.spyOn(global, 'fetch').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    const response = await completeGithubSignIn(new Request(`https://app.devmentor.example/api/auth/github/callback?state=${state}&code=code`, { headers: { cookie } }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('github_failed');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
