import { mentorInvitationCreateSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, readJsonBody, requireOperator, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  requireOperator(session);
  const input = parseOrThrow(mentorInvitationCreateSchema, await readJsonBody(request));
  return withScope(({ mentorInvitationService }) => mentorInvitationService.create(session, input));
});
