import { apiHandler, requireSession, withScope } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  return withScope(async ({ vaultSettings, invitationService, vaultReviewService }) => {
    if (!vaultSettings().enabled) throw new NotFoundError();
    if (!(await invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
    return vaultReviewService.list(session);
  });
});
