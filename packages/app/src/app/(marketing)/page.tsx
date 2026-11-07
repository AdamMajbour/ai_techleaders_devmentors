import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';
import { MenteeSessionsHome } from './seeker/mentee-sessions-home';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'My sessions' };

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;
  if (!session) redirect('/login');

  const access = await withScope(async ({ invitationService }) => ({
    mentee: await invitationService.isAcceptedSeeker(session.userId),
    pilot: await invitationService.isPilotMember(session.userId),
  }));

  if (access.mentee) {
    return <MenteeSessionsHome />;
  }
  if (access.pilot) redirect('/mentors');

  return (
    <main className="mx-auto flex max-w-content flex-col gap-group p-panel-compact">
      <h1 className="m-0 text-page-title font-strong text-headline">Your account is ready</h1>
      <p className="m-0 text-body text-muted-foreground">You are signed in. This account does not have access to a DevMentor pilot yet.</p>
    </main>
  );
}
