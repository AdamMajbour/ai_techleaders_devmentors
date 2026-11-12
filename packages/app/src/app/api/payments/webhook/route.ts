import { makeWebhookRoute, verifyConfiguredPaymentWebhook } from '@devmentor/core/server';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';

const webhook = makeWebhookRoute({
  verify: verifyConfiguredPaymentWebhook,
  handler: async (rawBody, headers, { cradle, background }) => {
    const event = cradle.paymentGateway.parseWebhook(rawBody, headers);
    if (event) await cradle.paymentService.handleEvent(event);
    if (event?.subjectType === 'vault_answer' && event.type === 'checkout.completed') {
      background?.(async () => {
        const payment = await cradle.paymentRepository.findBySubject('vault_answer', event.subjectId ?? '');
        if (payment?.status === 'succeeded') await cradle.vaultGenerationTask.run({ limit: 5 });
      });
    }
    return { received: true };
  },
  background: (task) => after(task),
});

/** POST /api/payments/webhook — verifies the signature for the configured payment provider. */
export const { POST } = webhook;
