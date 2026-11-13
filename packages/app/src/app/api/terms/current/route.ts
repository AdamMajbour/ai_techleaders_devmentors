import { parseOrThrow, termsKindSchema } from '@devmentor/core';
import { apiHandler, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const kind = parseOrThrow(termsKindSchema, new URL(request.url).searchParams.get('kind'));
  return withScope(({ termsService }) => termsService.current(kind));
});
