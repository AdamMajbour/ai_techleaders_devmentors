/** @jest-environment node */
import { ConflictError } from './errors';
import type { Cradle } from '../container/cradle';

const cradle = { marker: 'scope' } as unknown as Cradle;
const withScope = jest.fn(async (fn: (c: Cradle) => Promise<unknown>) => fn(cradle));

jest.mock('../container/container', () => ({ withScope: (fn: never) => withScope(fn) }));

import { makeWebhookRoute } from './makeWebhookRoute';
import {
  MOCK_PAYMENT_SIGNATURE_HEADER,
  MOCK_PAYMENT_SIGNATURE_VALUE,
  verifyMockPaymentWebhook,
} from '../services/payments/mock-webhook-verifier';

const json = (response: Response) => response.json();

beforeEach(() => {
  withScope.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('makeWebhookRoute', () => {
  it('accepts a signed mock webhook and rejects a missing or invalid mock signature', async () => {
    const handler = jest.fn(async () => ({ received: true }));
    const route = makeWebhookRoute({ verify: verifyMockPaymentWebhook, handler });
    const rawBody = '{"type":"checkout.completed"}';
    const signedRequest = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: { [MOCK_PAYMENT_SIGNATURE_HEADER]: MOCK_PAYMENT_SIGNATURE_VALUE },
      body: rawBody,
    });

    const signedResponse = await route.POST(signedRequest, undefined);
    expect(signedResponse.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(rawBody, signedRequest.headers, { cradle });

    handler.mockClear();
    const invalidResponse = await route.POST(
      new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: { [MOCK_PAYMENT_SIGNATURE_HEADER]: 'invalid' },
        body: rawBody,
      }),
      undefined,
    );
    expect(invalidResponse.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns a generic 400 for a bad signature without exposing or logging the body', async () => {
    const rawBody = '{"private":"sensitive-payload"}';
    const verify = jest.fn(async () => false);
    const handler = jest.fn(async () => 'processed');
    const route = makeWebhookRoute({ verify, handler });
    const request = new Request('http://localhost/api/webhooks/payments', {
      method: 'POST',
      body: rawBody,
    });
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const response = await route.POST(request, undefined);
    const responseText = await response.text();

    expect(response.status).toBe(400);
    expect(JSON.parse(responseText)).toEqual({
      ok: false,
      error: { code: 'validation_failed', message: 'Invalid webhook signature.' },
    });
    expect(responseText).not.toContain(rawBody);
    expect(stderrSpy).not.toHaveBeenCalled();
    expect(verify).toHaveBeenCalledWith(rawBody, request.headers);
    expect(handler).not.toHaveBeenCalled();
    expect(withScope).not.toHaveBeenCalled();
  });

  it('returns the same generic 400 when the verifier rejects a missing signature', async () => {
    const route = makeWebhookRoute({
      verify: jest.fn(async (_body, headers) => headers.has('x-provider-signature')),
      handler: jest.fn(async () => 'processed'),
    });
    const response = await route.POST(
      new Request('http://localhost/api/webhooks/payments', { method: 'POST', body: '{}' }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      ok: false,
      error: { code: 'validation_failed', message: 'Invalid webhook signature.' },
    });
  });

  it('passes the raw body and headers to verification and runs the handler in scope', async () => {
    const rawBody = ' {\n  "event": "payment.succeeded" \n}\n';
    const verify = jest.fn(async (body: string, headers: Headers) => {
      expect(body).toBe(rawBody);
      expect(headers.get('x-provider-signature')).toBe('valid');
      return true;
    });
    const handler = jest.fn(async (body: string, headers: Headers, ctx: { cradle: Cradle }) => ({
      body,
      signature: headers.get('x-provider-signature'),
      scoped: (ctx.cradle as unknown as { marker: string }).marker,
    }));
    const route = makeWebhookRoute({ verify, handler });
    const request = new Request('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-provider-signature': 'valid',
        cookie: 'devmentor_session=irrelevant',
      },
      body: rawBody,
    });
    const textSpy = jest.spyOn(request, 'text');

    const response = await route.POST(request, undefined);

    expect(await json(response)).toEqual({
      ok: true,
      data: { body: rawBody, signature: 'valid', scoped: 'scope' },
    });
    expect(textSpy).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(rawBody, request.headers, { cradle });
    expect(withScope).toHaveBeenCalledTimes(1);
  });

  it('maps verifier failures through the standard generic 500 response', async () => {
    const rawBody = '{"event":"private"}';
    const route = makeWebhookRoute({
      verify: jest.fn(async () => {
        throw new Error('verification failed');
      }),
      handler: jest.fn(async () => 'processed'),
    });
    const response = await route.POST(
      new Request('http://localhost/api/webhooks/payments', { method: 'POST', body: rawBody }),
      undefined,
    );
    const responseText = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(responseText)).toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong.' },
    });
    expect(responseText).not.toContain(rawBody);
    expect(withScope).not.toHaveBeenCalled();
  });

  it('maps handler errors through the standard API error envelope', async () => {
    const route = makeWebhookRoute({
      verify: jest.fn(async () => true),
      handler: jest.fn(async () => {
        throw new ConflictError('Already processed.');
      }),
    });
    const response = await route.POST(
      new Request('http://localhost/api/webhooks/payments', { method: 'POST', body: '{}' }),
      undefined,
    );

    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({
      ok: false,
      error: { code: 'conflict', message: 'Already processed.' },
    });
  });
});
