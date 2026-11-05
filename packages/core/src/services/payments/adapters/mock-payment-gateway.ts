import { createHash } from 'node:crypto';
import type {
  CheckoutCompletedEvent,
  CheckoutExpiredEvent,
  CheckoutFailedEvent,
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedPaymentEvent,
  PaymentGateway,
  RefundInput,
} from '../payment-gateway.port';

interface StoredCheckout {
  input: CreateCheckoutInput;
  result: CreateCheckoutResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNormalizedPaymentEvent(value: unknown): value is NormalizedPaymentEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (typeof value.bookingId !== 'string' || typeof value.providerSessionId !== 'string') return false;

  if (value.type === 'checkout.completed') {
    return (
      typeof value.providerPaymentId === 'string' &&
      typeof value.amountMinor === 'number' &&
      Number.isSafeInteger(value.amountMinor) &&
      value.amountMinor >= 0 &&
      typeof value.currency === 'string' &&
      (value.livemode === undefined || typeof value.livemode === 'boolean')
    );
  }

  if (value.type === 'checkout.expired' || value.type === 'checkout.failed') {
    return value.providerPaymentId === undefined || typeof value.providerPaymentId === 'string';
  }

  return false;
}

function stableIdempotencyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 24);
}

export class MockPaymentGateway implements PaymentGateway {
  private readonly checkouts = new Map<string, StoredCheckout>();
  private readonly checkoutByIdempotencyKey = new Map<string, StoredCheckout>();
  private readonly checkoutEvents = new Map<string, NormalizedPaymentEvent>();
  private readonly refunds = new Map<string, RefundInput>();

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const existing = this.checkoutByIdempotencyKey.get(input.idempotencyKey);
    if (existing) {
      if (!this.sameCheckoutInput(existing.input, input)) {
        throw new Error('Idempotency key was reused with different checkout details.');
      }
      return { ...existing.result };
    }

    const providerSessionId = `mock_session_${stableIdempotencyHash(input.idempotencyKey)}`;
    const stored: StoredCheckout = {
      input: { ...input },
      result: {
        providerSessionId,
        url: `https://mock-payment.local/checkout/${providerSessionId}`,
      },
    };
    this.checkouts.set(providerSessionId, stored);
    this.checkoutByIdempotencyKey.set(input.idempotencyKey, stored);
    return { ...stored.result };
  }

  async refund(input: RefundInput): Promise<void> {
    const existing = this.refunds.get(input.idempotencyKey);
    if (existing) {
      if (
        existing.providerPaymentId !== input.providerPaymentId ||
        existing.amountMinor !== input.amountMinor
      ) {
        throw new Error('Idempotency key was reused with different refund details.');
      }
      return;
    }
    this.refunds.set(input.idempotencyKey, { ...input });
  }

  parseWebhook(raw: string, headers: Headers): NormalizedPaymentEvent {
    void headers;
    const event: unknown = JSON.parse(raw);
    if (!isNormalizedPaymentEvent(event)) {
      throw new Error('Invalid mock payment webhook payload.');
    }
    return event;
  }

  async getCheckout(providerSessionId: string): Promise<NormalizedPaymentEvent | null> {
    return this.checkoutEvents.get(providerSessionId) ?? null;
  }

  completeCheckout(
    providerSessionId: string,
    details: { providerPaymentId?: string; livemode?: boolean } = {},
  ): CheckoutCompletedEvent {
    const checkout = this.requireCheckout(providerSessionId);
    const event: CheckoutCompletedEvent = {
      type: 'checkout.completed',
      bookingId: checkout.input.bookingId,
      providerSessionId,
      providerPaymentId: details.providerPaymentId ?? `mock_payment_${providerSessionId}`,
      amountMinor: checkout.input.amountMinor,
      currency: checkout.input.currency,
      livemode: details.livemode ?? false,
    };
    this.storeTerminalEvent(event);
    return event;
  }

  expireCheckout(providerSessionId: string): CheckoutExpiredEvent {
    const checkout = this.requireCheckout(providerSessionId);
    const event: CheckoutExpiredEvent = {
      type: 'checkout.expired',
      bookingId: checkout.input.bookingId,
      providerSessionId,
    };
    this.storeTerminalEvent(event);
    return event;
  }

  failCheckout(providerSessionId: string, providerPaymentId?: string): CheckoutFailedEvent {
    const checkout = this.requireCheckout(providerSessionId);
    const event: CheckoutFailedEvent = {
      type: 'checkout.failed',
      bookingId: checkout.input.bookingId,
      providerSessionId,
      ...(providerPaymentId === undefined ? {} : { providerPaymentId }),
    };
    this.storeTerminalEvent(event);
    return event;
  }

  private requireCheckout(providerSessionId: string): StoredCheckout {
    const checkout = this.checkouts.get(providerSessionId);
    if (!checkout) throw new Error(`Unknown mock checkout: ${providerSessionId}`);
    return checkout;
  }

  private storeTerminalEvent(event: NormalizedPaymentEvent): void {
    const existing = this.checkoutEvents.get(event.providerSessionId);
    if (existing) {
      if (JSON.stringify(existing) === JSON.stringify(event)) return;
      throw new Error('Mock checkout already has a terminal event.');
    }
    this.checkoutEvents.set(event.providerSessionId, event);
  }

  private sameCheckoutInput(left: CreateCheckoutInput, right: CreateCheckoutInput): boolean {
    return (
      left.bookingId === right.bookingId &&
      left.amountMinor === right.amountMinor &&
      left.currency === right.currency &&
      left.idempotencyKey === right.idempotencyKey
    );
  }
}
