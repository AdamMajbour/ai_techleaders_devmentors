import { apiHandler, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  return withScope(({ connectPayoutService }) => connectPayoutService.status(session));
});
