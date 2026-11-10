import { apiHandler, requireSession, requireOperator, withScope } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

export const dynamic = 'force-dynamic';
export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  requireOperator(session);
  return withScope(async ({ vaultSettings, vaultReviewService }) => {
    if (!vaultSettings().enabled) throw new NotFoundError();
    return vaultReviewService.operatorList(session);
  });
});
