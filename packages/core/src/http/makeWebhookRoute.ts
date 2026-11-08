import type { Cradle } from '../container/cradle';
import { withScope } from '../container/container';
import { apiHandler } from './apiHandler';
import { ValidationError } from './errors';

/** Verifies a webhook against its exact request body and headers. */
export type WebhookVerification = (rawBody: string, headers: Headers) => Promise<boolean>;

export interface WebhookRouteConfig {
  verify: WebhookVerification;
  handler: (rawBody: string, headers: Headers, ctx: { cradle: Cradle }) => Promise<unknown>;
}

/**
 * Builds a signed-webhook POST handler. The signature is the authentication check, so webhook
 * requests intentionally bypass session and CSRF validation.
 */
export function makeWebhookRoute(config: WebhookRouteConfig) {
  return {
    POST: apiHandler(async (request: Request) => {
      const rawBody = await request.text();
      const verified = await config.verify(rawBody, request.headers);
      if (!verified) throw new ValidationError('Invalid webhook signature.');

      return withScope((cradle) => config.handler(rawBody, request.headers, { cradle }));
    }),
  };
}
