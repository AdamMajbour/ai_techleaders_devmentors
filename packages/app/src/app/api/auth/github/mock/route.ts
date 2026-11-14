import { getEnv, getOperatorUserIds, issueSessionCookie, withScope } from '@devmentor/core/server';
import { UnauthorizedError } from '@devmentor/core';

export const dynamic = 'force-dynamic';

const personas = {
  mentee: { email: 'mock-mentee@devmentor.test', destination: '/seeker' },
  mentor: { email: 'mock-mentor@devmentor.test', destination: '/mentor' },
  operator: { email: 'mock-operator@devmentor.test', destination: '/operator' },
} as const;

/** Local-only shortcut that stands in for the GitHub OAuth callback in demo environments. */
export async function GET(request: Request): Promise<Response> {
  const baseUrl = getEnv().APP_BASE_URL ?? new URL(request.url).origin;
  if (process.env.NODE_ENV === 'production') {
    return Response.redirect(new URL('/login?error=github_unavailable', baseUrl));
  }

  const requested = new URL(request.url).searchParams.get('persona');
  if (!requested || !Object.hasOwn(personas, requested)) {
    return Response.redirect(new URL('/login?error=github_failed', baseUrl));
  }

  const persona = personas[requested as keyof typeof personas];
  try {
    const user = await withScope(async ({ userRepository, invitationService }) => {
      const account = await userRepository.findByEmail(persona.email);
      if (!account) throw new UnauthorizedError();
      if (requested === 'operator') {
        if (!getOperatorUserIds().includes(account.id)) throw new UnauthorizedError();
        if (!(await invitationService.isAcceptedMentor(account.id))) throw new UnauthorizedError();
      } else if (requested === 'mentor') {
        if (!(await invitationService.isAcceptedMentor(account.id))) throw new UnauthorizedError();
      } else if (!(await invitationService.isAcceptedSeeker(account.id))) {
        throw new UnauthorizedError();
      }
      return account;
    });
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(persona.destination, baseUrl).toString(),
        'Set-Cookie': await issueSessionCookie(user.id),
      },
    });
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    return Response.redirect(new URL('/login?error=github_failed', baseUrl));
  }
}
