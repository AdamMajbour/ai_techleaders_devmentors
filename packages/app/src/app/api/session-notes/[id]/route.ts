import { sessionNoteApprovalSchema, sessionNoteUpdateSchema } from '@devmentor/core';
import { apiHandler, readJsonBody, requireSession, withScope } from '@devmentor/core/server';

type Context = { params: Promise<{ id: string }> };
export const GET = apiHandler(async (request, context: Context) => {
  const session = await requireSession(request);
  const { id } = await context.params;
  return withScope(({ sessionNoteService }) => sessionNoteService.get(session, id));
});
export const PUT = apiHandler(async (request, context: Context) => {
  const session = await requireSession(request);
  const { id } = await context.params;
  const input = sessionNoteUpdateSchema.parse(await readJsonBody(request));
  return withScope(({ sessionNoteService }) => sessionNoteService.update(session, id, input));
});
export const DELETE = apiHandler(async (request, context: Context) => {
  const session = await requireSession(request);
  const { id } = await context.params;
  return withScope(({ sessionNoteService }) => sessionNoteService.remove(session, id));
});
export const POST = apiHandler(async (request, context: Context) => {
  const session = await requireSession(request);
  const { id } = await context.params;
  const body = sessionNoteApprovalSchema.parse(await readJsonBody(request));
  return withScope(({ sessionNoteService }) => sessionNoteService.approve(session, id, body.approved));
});
