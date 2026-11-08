import type { z } from 'zod';
import type { Cradle } from '../container/cradle';
import { withScope } from '../container/container';
import { idSchema } from '../validators/id.schema';
import { parseOrThrow } from '../validators/parse';
import type { Session } from '../security/session';
import { assertCsrfSafe } from '../security/csrf';
import { apiHandler } from './apiHandler';
import { requireSession } from './auth';
import { readJsonBody } from './body';

type RouteContext = { params?: Promise<Record<string, string | string[] | undefined>> };
type ActionContext = { cradle: Cradle; session: Session };

export interface ActionRouteConfig<TBody> {
  body: z.ZodType<TBody>;
  handler: (id: string, body: TBody, ctx: ActionContext) => Promise<unknown>;
}

/**
 * Builds a POST handler for a resource action. Mutations validate CSRF, session, id, then body
 * before invoking the action in a request-scoped container.
 */
export function makeActionRoute<TBody>(config: ActionRouteConfig<TBody>) {
  return {
    POST: apiHandler(async (request: Request, context: RouteContext) => {
      assertCsrfSafe(request);
      const session = await requireSession(request);
      const params = await context?.params;
      const id = parseOrThrow(idSchema, params?.id);
      const body = parseOrThrow(config.body, await readJsonBody(request));
      return withScope((cradle) => config.handler(id, body, { cradle, session }));
    }),
  };
}
