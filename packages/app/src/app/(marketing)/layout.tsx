import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { getEnv, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';
import { AppShell } from './app-shell';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;
  const name = session
    ? await withScope(async ({ userRepository }) => (await userRepository.findById(session.userId))?.name ?? null)
    : null;

  return <AppShell userName={name}>{children}</AppShell>;
}
