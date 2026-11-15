import { requirePanelAccess } from '../../../../lib/panel-access';
import { InvitationsView } from './invitations-view';

export const metadata = { title: 'Invitations · Admin' };

export default async function InvitationsPage() {
  await requirePanelAccess('operator');
  return (
    <main className="mx-auto flex w-full max-w-content min-w-0 flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-col gap-group">
        <h1 className="m-0 text-page-title font-strong text-headline">Invitations</h1>
        <p className="m-0 text-body text-muted-foreground">Invite mentors in batches and track their first published availability slot.</p>
      </header>
      <InvitationsView />
    </main>
  );
}
