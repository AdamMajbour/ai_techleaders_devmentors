import { sessionNoteCreateSchema } from '@devmentor/core';
import { apiHandler, readJsonBody, requireSession, withScope } from '@devmentor/core/server';

export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  return withScope(({ sessionNoteService }) => sessionNoteService.list(session));
});
export const POST = apiHandler(async (request) => {
  const session = await requireSession(request);
  const input = sessionNoteCreateSchema.parse(await readJsonBody(request));
  return withScope(({ sessionNoteService }) => sessionNoteService.create(session, input));
});
