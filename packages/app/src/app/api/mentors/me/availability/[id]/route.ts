import { idSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const DELETE = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  const { id } = await context.params;
  return withScope((cradle) => cradle.availabilityService.cancel(session, parseOrThrow(idSchema, id)));
});
