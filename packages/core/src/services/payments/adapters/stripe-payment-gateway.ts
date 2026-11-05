import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { getAppBaseUrl, type PaymentSettings } from '../../../config/env';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedPaymentEvent,
  PaymentGateway,
  RefundInput,
} from '../payment-gateway.port';

type StripeClient = Pick<Stripe, 'checkout' | 'refunds' | 'webhooks'>;
type StripeClientFactory = (secretKey: string) => StripeClient;
type BaseUrlProvider = () => string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.id === 'string') return value.id;
  return undefined;
}

function normalizeSession(
  session: Record<string, unknown>,
  type: 'checkout.completed' | 'checkout.expired' | 'checkout.failed',
): NormalizedPaymentEvent | null {
  const metadata = isRecord(session.metadata) ? session.metadata : null;
  const bookingId = metadata?.bookingId;
  const providerSessionId = session.id;
  const amountMinor = session.amount_total;
  const currency = session.currency;
  const livemode = session.livemode;
  const providerPaymentId = getId(session.payment_intent);

  if (
    typeof bookingId !== 'string' ||
    typeof providerSessionId !== 'string' ||
    typeof amountMinor !== 'number' ||
    !Number.isSafeInteger(amountMinor) ||
    typeof currency !== 'string' ||
    typeof livemode !== 'boolean'
  ) {
    return null;
  }

  if (type === 'checkout.completed') {
    if (!providerPaymentId) return null;
    return {
      type,
      bookingId,
      providerSessionId,
      providerPaymentId,
      amountMinor,
      currency: currency.toUpperCase(),
      livemode,
    };
  }

  return {
    type,
    bookingId,
    providerSessionId,
    ...(providerPaymentId === undefined ? {} : { providerPaymentId }),
    amountMinor,
    currency: currency.toUpperCase(),
    livemode,
  };
}

function normalizedIdempotencyKey(key: string): string {
  return `devmentor-checkout-${createHash('sha256').update(key).digest('hex')}`;
}

export class StripePaymentGateway implements PaymentGateway {
  readonly provider = 'stripe' as const;
  private stripeClient: StripeClient | null = null;

  constructor(
    private readonly settings: PaymentSettings,
    private readonly createStripeClient: StripeClientFactory = (secretKey) => new Stripe(secretKey),
    private readonly baseUrl: BaseUrlProvider = getAppBaseUrl,
  ) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new Error('Stripe checkout amount must be a positive integer in minor units.');
    }
    if (!/^[a-zA-Z]{3}$/.test(input.currency)) {
      throw new Error('Stripe checkout currency must be a three-letter code.');
    }

    const { stripe } = this.getStripe();
    const baseUrl = this.baseUrl();
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              product_data: { name: 'DevMentor booking' },
            },
          },
        ],
        metadata: { bookingId: input.bookingId },
        success_url: `${baseUrl}/bookings/${input.bookingId}/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/mentors?checkout=cancelled`,
      },
      { idempotencyKey: normalizedIdempotencyKey(input.idempotencyKey) },
    );

    if (!session.id || !session.url || !session.url.startsWith('https://')) {
      throw new Error('Stripe returned an invalid Checkout Session URL.');
    }
    return { providerSessionId: session.id, url: session.url };
  }

  async refund(input: RefundInput): Promise<void> {
    const { stripe } = this.getStripe();
    await stripe.refunds.create(
      { payment_intent: input.providerPaymentId, amount: input.amountMinor },
      { idempotencyKey: input.idempotencyKey },
    );
  }

  async verifyWebhook(raw: string, headers: Headers): Promise<boolean> {
    const { stripe, webhookSecret } = this.getStripe();
    const signature = headers.get('stripe-signature');
    if (!signature) return false;
    try {
      stripe.webhooks.constructEvent(raw, signature, webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  parseWebhook(raw: string, headers: Headers): NormalizedPaymentEvent | null {
    const { stripe, webhookSecret } = this.getStripe();
    const signature = headers.get('stripe-signature');
    if (!signature) throw new Error('Missing Stripe webhook signature.');

    const event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
    const object: unknown = event.data.object;
    if (!isRecord(object)) return null;

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      if (object.payment_status !== 'paid') return null;
      return normalizeSession(object, 'checkout.completed');
    }
    if (event.type === 'checkout.session.expired') {
      return normalizeSession(object, 'checkout.expired');
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      return normalizeSession(object, 'checkout.failed');
    }
    return null;
  }

  async getCheckout(providerSessionId: string): Promise<NormalizedPaymentEvent | null> {
    const { stripe } = this.getStripe();
    const session = await stripe.checkout.sessions.retrieve(providerSessionId);
    const normalizedSession = session as unknown as Record<string, unknown>;
    if (session.status === 'expired') return normalizeSession(normalizedSession, 'checkout.expired');
    if (session.payment_status === 'paid') return normalizeSession(normalizedSession, 'checkout.completed');
    return null;
  }

  private getStripe(): { stripe: StripeClient; webhookSecret: string } {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYMENTS_LIVE_ENABLED } = this.settings;
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Invalid payment configuration: STRIPE_SECRET_KEY is required when PAYMENTS_MODE=stripe.');
    }
    if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(STRIPE_SECRET_KEY)) {
      throw new Error('Invalid payment configuration: STRIPE_SECRET_KEY is not a valid Stripe secret key.');
    }
    if (STRIPE_SECRET_KEY.startsWith('sk_live_') && !PAYMENTS_LIVE_ENABLED) {
      throw new Error('Invalid payment configuration: PAYMENTS_LIVE_ENABLED must be true for a live Stripe key.');
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error('Invalid payment configuration: STRIPE_WEBHOOK_SECRET is required when PAYMENTS_MODE=stripe.');
    }
    if (!/^whsec_[A-Za-z0-9]+$/.test(STRIPE_WEBHOOK_SECRET)) {
      throw new Error('Invalid payment configuration: STRIPE_WEBHOOK_SECRET is not a valid Stripe webhook secret.');
    }
    this.stripeClient ??= this.createStripeClient(STRIPE_SECRET_KEY);
    return { stripe: this.stripeClient, webhookSecret: STRIPE_WEBHOOK_SECRET };
  }
}
