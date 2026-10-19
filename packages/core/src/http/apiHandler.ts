import { HTTP_STATUS } from '../constants';
import { createLogger, type Logger } from '../logger';
import { AppError } from './errors';
import type { ApiEnvelope } from './envelope';

type RouteHandler<TContext> = (request: Request, context: TContext) => Promise<unknown>;

const defaultLogger = createLogger();

function json<T>(body: ApiEnvelope<T>, status: number): Response {
  return Response.json(body, { status });
}

/**
 * Wraps a route handler. Whatever it returns becomes `{ ok: true, data }` (return a `Response`
 * to take full control); a thrown `AppError` becomes `{ ok: false, error }` with its status;
 * anything else is logged and answered with a generic 500, never a stack trace.
 * Route files contain no try/catch of their own.
 */
export function apiHandler<TContext = unknown>(handler: RouteHandler<TContext>, logger: Logger = defaultLogger) {
  return async (request: Request, context: TContext): Promise<Response> => {
    try {
      const result = await handler(request, context);
      return result instanceof Response ? result : json({ ok: true, data: result }, HTTP_STATUS.OK);
    } catch (error) {
      if (error instanceof AppError) {
        return json(
          { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
          error.status,
        );
      }
      logger.error('Unhandled error in API route', { error, method: request.method, url: new URL(request.url).pathname });
      return json(
        { ok: false, error: { code: 'internal_error', message: 'Something went wrong.' } },
        HTTP_STATUS.INTERNAL_ERROR,
      );
    }
  };
}
