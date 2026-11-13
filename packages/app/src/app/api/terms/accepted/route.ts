import { parseOrThrow, termsKindSchema } from '@devmentor/core';
import { apiHandler, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  const kind = parseOrThrow(termsKindSchema, new URL(request.url).searchParams.get('kind'));
  return withScope(({ termsService }) => termsService.accepted(session, kind));
});
