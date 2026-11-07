import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv, getOperatorUserIds, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';

export default async function AdminRedirectPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;

  if (!session) redirect('/login');

  if (getOperatorUserIds().includes(session.userId)) redirect('/operator');

  const isMentor = await withScope(({ invitationService }) =>
    invitationService.isAcceptedMentor(session.userId),
  );

  if (isMentor) redirect('/mentor');
  redirect('/');
}
