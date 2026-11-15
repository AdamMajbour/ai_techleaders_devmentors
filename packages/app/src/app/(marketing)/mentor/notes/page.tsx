import { MentorNotesList } from './mentor-notes-view';
import { requirePanelAccess } from '../../../../lib/panel-access';
import { withScope } from '@devmentor/core/server';

export const metadata = { title: 'Your notes' };

export default async function MentorNotesPage() {
  const session = await requirePanelAccess('mentor');
  const credits = await withScope(async ({ vaultSettings, ledgerService }) => {
    if (!vaultSettings().enabled) return undefined;
    const [balances, entries] = await Promise.all([ledgerService.balances(session.userId), ledgerService.entriesFor(session.userId)]);
    return { balanceMinor: balances.balanceMinor, testBalanceMinor: balances.testBalanceMinor, currency: 'PLN', entries: entries.map((entry) => ({ id: entry.id, date: entry.createdAt, amountMinor: entry.amountMinor, livemode: entry.livemode })) };
  });
  return <MentorNotesList credits={credits} />;
}
