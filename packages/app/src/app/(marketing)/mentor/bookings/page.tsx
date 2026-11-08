import { MentorBookingsView } from './mentor-bookings-view';
import { requirePanelAccess } from '../../../../lib/panel-access';

export const metadata = { title: 'Bookings' };

export default async function MentorBookingsPage() {
  await requirePanelAccess('mentor');
  return <MentorBookingsView />;
}
