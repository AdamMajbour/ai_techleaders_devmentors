import { describe, expect, it } from '@jest/globals';
import type {
  CheckoutCompletedEvent,
  NormalizedPaymentEvent,
  PaymentGateway,
} from './payment-gateway.port';

export interface PaymentGatewayContractHarness<Gateway extends PaymentGateway> {
  createGateway(): Gateway;
  completeCheckout(gateway: Gateway, event: CheckoutCompletedEvent): Promise<void> | void;
  createWebhookPayload(event: NormalizedPaymentEvent): { raw: string; headers: Headers };
}

const checkoutInput = {
  bookingId: 'booking-contract',
  amountMinor: 2500,
  currency: 'EUR',
  idempotencyKey: 'booking-contract-checkout',
};

const webhookEvents: NormalizedPaymentEvent[] = [
  {
    type: 'checkout.completed',
    bookingId: checkoutInput.bookingId,
    providerSessionId: 'session-contract',
    providerPaymentId: 'payment-contract',
    amountMinor: checkoutInput.amountMinor,
    currency: checkoutInput.currency,
    livemode: false,
  },
  {
    type: 'checkout.expired',
    bookingId: checkoutInput.bookingId,
    providerSessionId: 'session-contract',
    amountMinor: checkoutInput.amountMinor,
    currency: checkoutInput.currency,
    livemode: false,
  },
  {
    type: 'checkout.failed',
    bookingId: checkoutInput.bookingId,
    providerSessionId: 'session-contract',
    providerPaymentId: 'payment-contract',
    amountMinor: checkoutInput.amountMinor,
    currency: checkoutInput.currency,
    livemode: false,
  },
];

export function registerPaymentGatewayContractTests<Gateway extends PaymentGateway>(
  adapterName: string,
  harness: PaymentGatewayContractHarness<Gateway>,
): void {
  describe(`${adapterName} PaymentGateway contract`, () => {
    it('creates an idempotent checkout that starts unreconciled', async () => {
      const gateway = harness.createGateway();
      const first = await gateway.createCheckout(checkoutInput);
      const retry = await gateway.createCheckout(checkoutInput);

      expect(retry).toEqual(first);
      expect(first.providerSessionId).toBeTruthy();
      expect(first.url).toMatch(/^(?:https:\/\/\S+|\/mock-payment\/checkout\/[a-zA-Z0-9-]+)$/);
      await expect(gateway.getCheckout(first.providerSessionId)).resolves.toBeNull();
    });

    it('reconciles a completed checkout with the full payment event', async () => {
      const gateway = harness.createGateway();
      const checkout = await gateway.createCheckout(checkoutInput);
      const event: CheckoutCompletedEvent = {
        type: 'checkout.completed',
        bookingId: checkoutInput.bookingId,
        providerSessionId: checkout.providerSessionId,
        providerPaymentId: 'payment-contract',
        amountMinor: checkoutInput.amountMinor,
        currency: checkoutInput.currency,
        livemode: false,
      };

      await harness.completeCheckout(gateway, event);

      await expect(gateway.getCheckout(checkout.providerSessionId)).resolves.toEqual(event);
    });

    it.each(webhookEvents)('normalizes the $type webhook event', async (event) => {
      const gateway = harness.createGateway();
      const payload = harness.createWebhookPayload(event);

      await expect(gateway.verifyWebhook(payload.raw, payload.headers)).resolves.toBe(true);
      expect(gateway.parseWebhook(payload.raw, payload.headers)).toEqual(event);
    });

    it('accepts idempotent refund retries', async () => {
      const gateway = harness.createGateway();
      const refund = {
        providerPaymentId: 'payment-contract',
        amountMinor: 2500,
        idempotencyKey: 'booking-contract-refund',
      };

      await expect(gateway.refund(refund)).resolves.toBeUndefined();
      await expect(gateway.refund(refund)).resolves.toBeUndefined();
    });
  });
}
