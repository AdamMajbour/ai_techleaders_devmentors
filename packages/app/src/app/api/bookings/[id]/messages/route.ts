import { apiHandler, makeActionRoute, requireSession, withScope } from '@devmentor/core/server';
import { idSchema, messageBodySchema, parseOrThrow } from '@devmentor/core';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (request: Request, context: Context) => {
  const session = await requireSession(request);
  const { id: rawId } = await context.params;
  const id = parseOrThrow(idSchema, rawId);
  const after = new URL(request.url).searchParams.get('after') ?? undefined;
  return withScope(({ messageService }) => messageService.list(session, id, after));
});

const postMessage = makeActionRoute({
  body: z.object({ body: messageBodySchema }),
  handler: (id, input, { cradle, session }) => cradle.messageService.post(session, id, input.body),
});

export const { POST } = postMessage;
