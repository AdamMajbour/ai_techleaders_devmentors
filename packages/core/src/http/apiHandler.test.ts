/** @jest-environment node */
import { apiHandler } from './apiHandler';
import { StatusTransitionConflictError } from '@devmentor/db';
import { ForbiddenError, ValidationError } from './errors';

const request = new Request('http://localhost/api/things?secret=1', { method: 'GET' });

function loggerSpy() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

describe('apiHandler', () => {
  it('wraps a returned value in a success envelope', async () => {
    const response = await apiHandler(async () => ({ id: 1 }), loggerSpy())(request, undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: 1 } });
  });

  it('passes a returned Response through untouched', async () => {
    const created = new Response(null, { status: 201 });
    const response = await apiHandler(async () => created, loggerSpy())(request, undefined);

    expect(response).toBe(created);
  });

  it('maps an AppError to its status and an error envelope with field errors', async () => {
    const handler = apiHandler(async () => {
      throw new ValidationError('bad input', { authorId: ['Invalid UUID'] });
    }, loggerSpy());
    const response = await handler(request, undefined);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'validation_failed', message: 'bad input', fieldErrors: { authorId: ['Invalid UUID'] } },
    });
  });

  it('does not log expected AppErrors', async () => {
    const logger = loggerSpy();
    await apiHandler(async () => {
      throw new ForbiddenError();
    }, logger)(request, undefined);

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('maps database transition conflicts to HTTP 409 without logging them', async () => {
    const logger = loggerSpy();
    const response = await apiHandler(async () => {
      throw new StatusTransitionConflictError();
    }, logger)(request, undefined);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'conflict', message: 'The request conflicts with the current state.' },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('answers an unexpected error with a generic 500, logs it, and never leaks details or the query string', async () => {
    const logger = loggerSpy();
    const handler = apiHandler(async () => {
      throw new Error('connection to db-prod-7 refused');
    }, logger);
    const response = await handler(request, undefined);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain('db-prod-7');
    expect(JSON.parse(body)).toEqual({ ok: false, error: { code: 'internal_error', message: 'Something went wrong.' } });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][1]).toMatchObject({ method: 'GET', url: '/api/things' });
  });

  it('passes the route context to the handler', async () => {
    const handler = apiHandler(async (_request, context: { params: { id: string } }) => context.params.id, loggerSpy());
    const response = await handler(request, { params: { id: 'abc' } });

    expect(await response.json()).toEqual({ ok: true, data: 'abc' });
  });
});
