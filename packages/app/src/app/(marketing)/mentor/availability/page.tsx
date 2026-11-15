import { MentorAvailabilityView } from './availability-view';
import { requirePanelAccess } from '../../../../lib/panel-access';

export const metadata = { title: 'Session availability' };

export default async function MentorAvailabilityPage() {
  await requirePanelAccess('mentor');
  return <MentorAvailabilityView />;
}
