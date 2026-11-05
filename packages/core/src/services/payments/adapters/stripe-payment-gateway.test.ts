/** @jest-environment node */
import Stripe from 'stripe';
import { parsePaymentSettings } from '../../../config/env';
import { registerPaymentGatewayContractTests } from '../payment-gateway.contract';
import { verifyConfiguredPaymentWebhook } from '../payment-gateway.factory';
import {
  MOCK_PAYMENT_SIGNATURE_HEADER,
  MOCK_PAYMENT_SIGNATURE_VALUE,
} from '../mock-webhook-verifier';
import type {
  CheckoutCompletedEvent,
  NormalizedPaymentEvent,
} from '../payment-gateway.port';
import { StripePaymentGateway } from './stripe-payment-gateway';

const webhookSecret = 'whsec_contractsecret123';
const stripeForSignatures = new Stripe('sk_test_signing123');

interface FakeStripeState {
  gateway: StripePaymentGateway;
  getSession(): Record<string, unknown>;
  setSession(session: Record<string, unknown>): void;
  create: jest.Mock;
}

function createFakeGateway(): FakeStripeState {
  let session: Record<string, unknown> = {};
  const create = jest.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
    const item = params.line_items?.[0];
    session = {
      id: 'cs_test_contract',
      object: 'checkout.session',
      url: 'https://checkout.stripe.com/c/pay/cs_test_contract',
      metadata: params.metadata,
      amount_total: item?.price_data?.unit_amount,
      currency: item?.price_data?.currency,
      livemode: false,
      payment_intent: null,
      payment_status: 'unpaid',
      status: 'open',
    };
    return session;
  });
  const client = {
    checkout: {
      sessions: {
        create,
        retrieve: jest.fn(async () => session),
      },
    },
    refunds: { create: jest.fn(async () => ({})) },
    webhooks: stripeForSignatures.webhooks,
  } as unknown as Stripe;
  const gateway = new StripePaymentGateway(
    parsePaymentSettings({
      PAYMENTS_MODE: 'stripe',
      STRIPE_SECRET_KEY: 'sk_test_contract123',
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    }),
    () => client,
    () => 'https://app.example.test',
  );
  return {
    gateway,
    getSession: () => session,
    setSession: (value) => { session = value; },
    create,
  };
}

function stripeSession(event: NormalizedPaymentEvent): Record<string, unknown> {
  return {
    id: event.providerSessionId,
    object: 'checkout.session',
    metadata: { bookingId: event.bookingId },
    amount_total: event.amountMinor,
    currency: event.currency.toLowerCase(),
    livemode: event.livemode,
    payment_intent: event.providerPaymentId ?? null,
    payment_status: event.type === 'checkout.completed' ? 'paid' : 'unpaid',
    status: event.type === 'checkout.expired' ? 'expired' : 'complete',
  };
}

function signedWebhook(
  type: string,
  session: Record<string, unknown>,
): { raw: string; headers: Headers } {
  const raw = JSON.stringify({
    id: 'evt_contract',
    object: 'event',
    api_version: '2025-03-31.basil',
    created: 1_798_900_000,
    data: { object: session },
    livemode: session.livemode ?? false,
    pending_webhooks: 1,
    request: null,
    type,
  });
  const signature = stripeForSignatures.webhooks.generateTestHeaderString({
    payload: raw,
    secret: webhookSecret,
  });
  return { raw, headers: new Headers({ 'stripe-signature': signature }) };
}

registerPaymentGatewayContractTests('StripePaymentGateway', {
  createGateway: () => {
    const state = createFakeGateway();
    states.set(state.gateway, state);
    return state.gateway;
  },
  completeCheckout: (gateway, event: CheckoutCompletedEvent) => {
    const state = states.get(gateway);
    state?.setSession(stripeSession(event));
  },
  createWebhookPayload: (event: NormalizedPaymentEvent) => {
    const type = {
      'checkout.completed': 'checkout.session.completed',
      'checkout.expired': 'checkout.session.expired',
      'checkout.failed': 'checkout.session.async_payment_failed',
    }[event.type];
    return signedWebhook(type, stripeSession(event));
  },
});

const states = new WeakMap<StripePaymentGateway, FakeStripeState>();

describe('StripePaymentGateway', () => {
  it('creates a checkout with server amount, currency, booking metadata and stable idempotency', async () => {
    const state = createFakeGateway();
    const input = {
      bookingId: 'booking-from-server',
      amountMinor: 3450,
      currency: 'EUR',
      idempotencyKey: 'booking-checkout-stable',
    };

    const first = await state.gateway.createCheckout(input);
    const second = await state.gateway.createCheckout(input);

    expect(second).toEqual(first);
    expect(first).toEqual({
      providerSessionId: 'cs_test_contract',
      url: 'https://checkout.stripe.com/c/pay/cs_test_contract',
    });
    expect(state.create).toHaveBeenCalledTimes(2);
    expect(state.create.mock.calls[0][0]).toMatchObject({
      mode: 'payment',
      metadata: { bookingId: input.bookingId },
      line_items: [{
        quantity: 1,
        price_data: {
          unit_amount: input.amountMinor,
          currency: 'eur',
        },
      }],
    });
    expect(state.create.mock.calls[0][1].idempotencyKey)
      .toBe(state.create.mock.calls[1][1].idempotencyKey);
    expect(state.create.mock.calls[0][1].idempotencyKey).not.toContain(input.idempotencyKey);
    expect(state.getSession()).toMatchObject({ metadata: { bookingId: input.bookingId } });
  });

  it('fails on first payment use when required credentials are missing or invalid', async () => {
    const noSecretKey = new StripePaymentGateway(
      parsePaymentSettings({ PAYMENTS_MODE: 'stripe', STRIPE_WEBHOOK_SECRET: webhookSecret }),
      jest.fn(),
    );
    await expect(noSecretKey.createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    })).rejects.toThrow(/STRIPE_SECRET_KEY/);

    const noWebhookSecret = new StripePaymentGateway(
      parsePaymentSettings({ PAYMENTS_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_contract123' }),
      jest.fn(),
    );
    await expect(noWebhookSecret.createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    })).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/);

    const badLiveKey = new StripePaymentGateway({
      ...parsePaymentSettings({ PAYMENTS_MODE: 'stripe', STRIPE_WEBHOOK_SECRET: webhookSecret }),
      STRIPE_SECRET_KEY: 'sk_live_secret123',
    }, jest.fn());
    await expect(badLiveKey.createCheckout({
      bookingId: 'booking-1',
      amountMinor: 2500,
      currency: 'EUR',
      idempotencyKey: 'checkout-1',
    })).rejects.toThrow(/PAYMENTS_LIVE_ENABLED/);
  });

  it('rejects invalid webhook signatures and safely ignores irrelevant Stripe events', async () => {
    const { gateway } = createFakeGateway();
    const invalid = new Headers({ 'stripe-signature': 'invalid' });
    expect(await gateway.verifyWebhook('{"invalid":true}', invalid)).toBe(false);

    const ignored = signedWebhook('customer.updated', { object: 'customer' });
    expect(await gateway.verifyWebhook(ignored.raw, ignored.headers)).toBe(true);
    expect(gateway.parseWebhook(ignored.raw, ignored.headers)).toBeNull();
  });

  it('uses the Stripe verifier in Stripe mode instead of accepting the mock marker', async () => {
    const previous = {
      PAYMENTS_MODE: process.env.PAYMENTS_MODE,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      PAYMENTS_LIVE_ENABLED: process.env.PAYMENTS_LIVE_ENABLED,
    };
    process.env.PAYMENTS_MODE = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_route123';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    process.env.PAYMENTS_LIVE_ENABLED = 'false';

    try {
      const signed = signedWebhook('checkout.session.expired', {
        id: 'cs_test_route',
        object: 'checkout.session',
      });
      await expect(verifyConfiguredPaymentWebhook(signed.raw, signed.headers)).resolves.toBe(true);

      const mockMarker = new Headers({
        [MOCK_PAYMENT_SIGNATURE_HEADER]: MOCK_PAYMENT_SIGNATURE_VALUE,
      });
      await expect(verifyConfiguredPaymentWebhook(signed.raw, mockMarker)).resolves.toBe(false);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('preserves Stripe livemode and payment identifiers from verified Checkout events', () => {
    const { gateway } = createFakeGateway();
    const event: CheckoutCompletedEvent = {
      type: 'checkout.completed',
      bookingId: 'booking-live-event',
      providerSessionId: 'cs_live_event',
      providerPaymentId: 'pi_live_event',
      amountMinor: 8700,
      currency: 'USD',
      livemode: true,
    };
    const payload = signedWebhook('checkout.session.completed', stripeSession(event));

    expect(gateway.parseWebhook(payload.raw, payload.headers)).toEqual(event);
  });
});
