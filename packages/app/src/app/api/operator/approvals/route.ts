import { apiHandler, requireSession, requireOperator, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  requireOperator(session);
  return withScope(({ refundService }) => refundService.listOperatorApprovals(session));
});
