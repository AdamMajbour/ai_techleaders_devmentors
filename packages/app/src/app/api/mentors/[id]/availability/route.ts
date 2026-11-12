import { idSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, requirePilotMember, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const session = await requirePilotMember(request);
  const { id } = await context.params;
  const mentorId = parseOrThrow(idSchema, id);
  return withScope((cradle) => cradle.availabilityService.list(session, mentorId));
});
