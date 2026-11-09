import { MentorNoteDetail } from '../mentor-notes-view';
import { requirePanelAccess } from '../../../../../lib/panel-access';

export const metadata = { title: 'Mentor note' };

export default async function MentorNotePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelAccess('mentor');
  const { id } = await params;
  return <MentorNoteDetail noteId={id} />;
}
