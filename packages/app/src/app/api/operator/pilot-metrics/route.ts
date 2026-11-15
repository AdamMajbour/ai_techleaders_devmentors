import { parseOrThrow, pilotMetricsQuerySchema } from '@devmentor/core';
import { apiHandler, requireOperator, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  requireOperator(session);
  const query = parseOrThrow(pilotMetricsQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  return withScope(({ pilotMetricsService }) => pilotMetricsService.read(query));
});
