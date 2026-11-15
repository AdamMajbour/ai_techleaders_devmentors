import type { z } from 'zod';
import type { Cradle } from '../container/cradle';
import { withScope } from '../container/container';
import { HTTP_STATUS } from '../constants';
import { idSchema } from '../validators/id.schema';
import { parseOrThrow } from '../validators/parse';
import type { Session } from '../security/session';
import { assertCsrfSafe } from '../security/csrf';
import { apiHandler, jsonResponse } from './apiHandler';
import { optionalSession, requireSession } from './auth';
import { readJsonBody } from './body';
import { ValidationError } from './errors';

type RouteContext = { params?: Promise<Record<string, string | string[] | undefined>> };

/** What a handler receives besides its validated input: the request's DI scope and, for mutations, the session. */
type Ctx<TSession> = {
  cradle: Cradle;
  session: TSession;
  background?: (task: () => Promise<void>) => void;
};

export interface CrudRouteConfig<TQuery, TCreate, TUpdate> {
  /** GET on the collection. Public unless `requireSession` is set. */
  list?: {
    query: z.ZodType<TQuery>;
    handler: (query: TQuery, ctx: Ctx<Session | null>) => Promise<unknown>;
    requireSession?: boolean;
    background?: (task: () => Promise<void>) => void;
  };
  /** GET with an `id` route param. Public unless `requireSession` is set. */
  read?: {
    handler: (id: string, ctx: Ctx<Session | null>) => Promise<unknown>;
    requireSession?: boolean;
    background?: (task: () => Promise<void>) => void;
  };
  /** POST. Always requires a session and the CSRF header: a mutation cannot be made public by configuration. */
  create?: {
    body: z.ZodType<TCreate>;
    handler: (input: TCreate, ctx: Ctx<Session>) => Promise<unknown>;
    background?: (task: () => Promise<void>) => void;
  };
  /** PUT with an `id` route param. Always requires a session and the CSRF header. */
  update?: { body: z.ZodType<TUpdate>; handler: (id: string, input: TUpdate, ctx: Ctx<Session>) => Promise<unknown> };
  /** DELETE with an `id` route param. Always requires a session and the CSRF header. */
  remove?: { handler: (id: string, ctx: Ctx<Session>) => Promise<unknown> };
}

async function readId(context: RouteContext): Promise<string> {
  const params = await context?.params;
  return parseOrThrow(idSchema, params?.id);
}

function notConfigured(): never {
  throw new ValidationError('This operation is not available for this resource.');
}

/**
 * Builds `{ GET, POST, PUT, DELETE }` for a plain CRUD resource from Zod schemas and service calls,
 * so a `route.ts` is configuration, not logic. Workflow endpoints that do not fit use `apiHandler` directly.
 * Order for mutations: CSRF header, session, body validation, service call (ownership lives in the service).
 */
export function makeCrudRoute<TQuery = never, TCreate = never, TUpdate = never>(
  config: CrudRouteConfig<TQuery, TCreate, TUpdate>,
) {
  return {
    GET: apiHandler(async (request: Request, context: RouteContext) => {
      const hasId = Boolean((await context?.params)?.id);
      const operation = hasId ? config.read : config.list;
      if (!operation) return notConfigured();

      const session = operation.requireSession ? await requireSession(request) : await optionalSession(request);
      if (hasId && config.read) {
        const id = await readId(context);
        return withScope((cradle) => config.read!.handler(id, {
          cradle,
          session,
          ...(config.read?.background ? { background: config.read.background } : {}),
        }));
      }
      const list = config.list!;
      const query = parseOrThrow(list.query, Object.fromEntries(new URL(request.url).searchParams));
      return withScope((cradle) => list.handler(query, {
        cradle,
        session,
        ...(list.background ? { background: list.background } : {}),
      }));
    }),

    POST: apiHandler(async (request: Request) => {
      const { create } = config;
      if (!create) return notConfigured();

      assertCsrfSafe(request);
      const session = await requireSession(request);
      const input = parseOrThrow(create.body, await readJsonBody(request));
      const created = await withScope((cradle) => create.handler(input, {
        cradle,
        session,
        ...(create.background ? { background: create.background } : {}),
      }));
      return jsonResponse(created, { status: HTTP_STATUS.CREATED });
    }),

    PUT: apiHandler(async (request: Request, context: RouteContext) => {
      const { update } = config;
      if (!update) return notConfigured();

      assertCsrfSafe(request);
      const session = await requireSession(request);
      const id = await readId(context);
      const input = parseOrThrow(update.body, await readJsonBody(request));
      return withScope((cradle) => update.handler(id, input, { cradle, session }));
    }),

    DELETE: apiHandler(async (request: Request, context: RouteContext) => {
      const { remove } = config;
      if (!remove) return notConfigured();

      assertCsrfSafe(request);
      const session = await requireSession(request);
      const id = await readId(context);
      return withScope((cradle) => remove.handler(id, { cradle, session }));
    }),
  };
}
