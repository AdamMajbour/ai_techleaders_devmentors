import { MentorNotesList } from './mentor-notes-view';
import { requirePanelAccess } from '../../../../lib/panel-access';

export const metadata = { title: 'Your notes' };

export default async function MentorNotesPage() {
  await requirePanelAccess('mentor');
  return <MentorNotesList />;
}
