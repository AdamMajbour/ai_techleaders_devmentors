import { getAppBaseUrl } from '@devmentor/core/server';
import { MentorProfileEditor } from './mentor-profile-editor';
import { requirePanelAccess } from '../../../../lib/panel-access';

export const metadata = { title: 'Mentor profile' };

export default async function MentorProfilePage() {
  await requirePanelAccess('mentor');
  return <MentorProfileEditor publicOrigin={getAppBaseUrl()} />;
}
