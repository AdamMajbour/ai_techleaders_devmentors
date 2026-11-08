import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv, requireOperator, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';
import type { Session } from '@devmentor/core';

export async function requirePanelAccess(panel: 'mentee' | 'mentor' | 'operator'): Promise<Session> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;
  if (!session) redirect('/login');

  if (panel === 'operator') {
    try {
      requireOperator(session);
      return session;
    } catch {
      redirect('/mentors');
    }
  }

  const permitted = await withScope(async ({ invitationService }) =>
    panel === 'mentor'
      ? invitationService.isAcceptedMentor(session.userId)
      : invitationService.isAcceptedSeeker(session.userId),
  );
  if (!permitted) redirect('/mentors');
  return session;
}
