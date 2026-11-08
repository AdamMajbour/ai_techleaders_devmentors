/** @jest-environment node */
import { MockPaymentGateway } from './mock-payment-gateway';
import { registerPaymentGatewayContractTests } from '../payment-gateway.contract';
import type { NormalizedPaymentEvent } from '../payment-gateway.port';
import {
  MOCK_PAYMENT_SIGNATURE_HEADER,
  MOCK_PAYMENT_SIGNATURE_VALUE,
} from '../mock-webhook-verifier';

registerPaymentGatewayContractTests('MockPaymentGateway', {
  createGateway: () => new MockPaymentGateway(),
  completeCheckout: (gateway, event) => {
    gateway.completeCheckout(event.providerSessionId, {
      providerPaymentId: event.providerPaymentId,
      livemode: event.livemode,
    });
  },
  createWebhookPayload: (event: NormalizedPaymentEvent) => ({
    raw: JSON.stringify(event),
    headers: new Headers({
      'content-type': 'application/json',
      [MOCK_PAYMENT_SIGNATURE_HEADER]: MOCK_PAYMENT_SIGNATURE_VALUE,
    }),
  }),
});

describe('MockPaymentGateway deterministic behavior', () => {
  it('generates the same provider session for a checkout idempotency key', async () => {
    const first = new MockPaymentGateway();
    const second = new MockPaymentGateway();
    const input = {
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    };

    await expect(first.createCheckout(input)).resolves.toEqual(await second.createCheckout(input));
  });

  it('routes mock checkouts back through the app-local test checkout page', async () => {
    const checkout = await new MockPaymentGateway().createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    });

    expect(checkout.url).toBe('/mock-payment/checkout/booking-1');
  });

  it('does not allow a checkout idempotency key to be reused with different input', async () => {
    const gateway = new MockPaymentGateway();
    await gateway.createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    });

    await expect(
      gateway.createCheckout({
        bookingId: 'booking-1',
        amountMinor: 3000,
        currency: 'EUR',
        idempotencyKey: 'checkout-1',
      }),
    ).rejects.toThrow('Idempotency key was reused with different checkout details.');
  });

  it('keeps completed sessions terminal', async () => {
    const gateway = new MockPaymentGateway();
    const checkout = await gateway.createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    });
    gateway.completeCheckout(checkout.providerSessionId);
    expect(() => gateway.failCheckout(checkout.providerSessionId)).toThrow(
      'Mock checkout already has a terminal event.',
    );
  });
});
