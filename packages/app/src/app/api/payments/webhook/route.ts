import { makeWebhookRoute, verifyConfiguredPaymentWebhook } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

const webhook = makeWebhookRoute({
  verify: verifyConfiguredPaymentWebhook,
  handler: async (rawBody, headers, { cradle }) => {
    const event = cradle.paymentGateway.parseWebhook(rawBody, headers);
    if (event) await cradle.paymentService.handleEvent(event);
    return { received: true };
  },
});

/** POST /api/payments/webhook — verifies the signature for the configured payment provider. */
export const { POST } = webhook;
