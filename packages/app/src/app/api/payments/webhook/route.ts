import { makeWebhookRoute, verifyMockPaymentWebhook } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

const webhook = makeWebhookRoute({
  verify: verifyMockPaymentWebhook,
  handler: async (rawBody, headers, { cradle }) => {
    const event = cradle.paymentGateway.parseWebhook(rawBody, headers);
    await cradle.paymentService.handleEvent(event);
    return { received: true };
  },
});

/** POST /api/payments/webhook — mock signature verification until the Stripe adapter lands. */
export const { POST } = webhook;
