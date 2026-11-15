import { apiHandler, assertCsrfSafe, requireOperator, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  requireOperator(session);
  return withScope(({ mentorInvitationService }) => mentorInvitationService.list(session));
});

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  requireOperator(session);
  return withScope(({ mentorInvitationService }) => mentorInvitationService.openBatch(session));
});
