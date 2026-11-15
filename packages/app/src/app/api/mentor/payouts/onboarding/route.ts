import { apiHandler, assertCsrfSafe, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  return withScope(({ connectPayoutService }) => connectPayoutService.startOnboarding(session));
});
