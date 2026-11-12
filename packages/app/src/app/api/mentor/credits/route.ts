import { apiHandler, requireSession, withScope } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

export const dynamic = 'force-dynamic';
export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  return withScope(async ({ vaultSettings, invitationService, ledgerService }) => {
    if (!vaultSettings().enabled || !(await invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
    const [balances, entries] = await Promise.all([ledgerService.balances(session.userId), ledgerService.entriesFor(session.userId)]);
    return {
      balanceMinor: balances.balanceMinor,
      testBalanceMinor: balances.testBalanceMinor,
      currency: 'EUR',
      entries: entries.map((entry) => ({ id: entry.id, date: entry.createdAt, amountMinor: entry.amountMinor, livemode: entry.livemode })),
    };
  });
});
