import { availabilitySlotCreateSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, readJsonBody, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  return withScope((cradle) => cradle.availabilityService.listOwn(session));
});

export const POST = apiHandler(async (request: Request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  const input = parseOrThrow(availabilitySlotCreateSchema, await readJsonBody(request));
  return withScope((cradle) => cradle.availabilityService.create(session, input));
});
