import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv, SESSION_COOKIE, verifySession, withScope } from '@devmentor/core/server';
import { ProfileEditor } from './profile-editor';

export const metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, getEnv().JWT_SECRET) : null;
  if (!session) redirect('/login');
  const data = await withScope(async ({ userService, invitationService }) => ({
    user: await userService.getById(session.userId),
    isMentor: await invitationService.isAcceptedMentor(session.userId),
  }));
  return <ProfileEditor user={data.user} isMentor={data.isMentor} />;
}
