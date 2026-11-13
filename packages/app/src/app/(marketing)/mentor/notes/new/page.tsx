import { MentorNoteDetail } from '../mentor-notes-view';
import { requirePanelAccess } from '../../../../../lib/panel-access';

export const metadata = { title: 'New note' };

export default async function NewMentorNotePage() {
  await requirePanelAccess('mentor');
  return <MentorNoteDetail />;
}
