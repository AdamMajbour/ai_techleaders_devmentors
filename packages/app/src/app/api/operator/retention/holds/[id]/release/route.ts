import { parseOrThrow, idSchema } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, requireOperator, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  requireOperator(session);
  const { id } = await context.params;
  const input = await request.json();
  return withScope(({ retentionService }) => retentionService.releaseHold(session, parseOrThrow(idSchema, id), input));
});
