import { parseOrThrow, termsAcceptSchema } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  const input = parseOrThrow(termsAcceptSchema, await request.json());
  return withScope(({ termsService }) => termsService.accept(session, input));
});
