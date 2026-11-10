import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { getEnv, getOperatorUserIds, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';
import { AppShell } from './app-shell';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;
  const identity = session ? await withScope(async ({ userRepository, invitationService }) => {
    const user = await userRepository.findById(session.userId);
    const [mentor, seeker] = await Promise.all([
      invitationService.isAcceptedMentor(session.userId),
      invitationService.isAcceptedSeeker(session.userId),
    ]);
    return { name: user?.name ?? null, mentor, seeker, operator: getOperatorUserIds().includes(session.userId) };
  }) : { name: null, mentor: false, seeker: false, operator: false };

  return <AppShell userName={identity.name} roles={{ mentor: identity.mentor, seeker: identity.seeker, operator: identity.operator }}>{children}</AppShell>;
}
