import { parseOrThrow, termsDraftSchema } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, requireOperator, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  requireOperator(session);
  const input = parseOrThrow(termsDraftSchema, await request.json());
  return withScope(({ termsService }) => termsService.createDraft(session, input));
});
