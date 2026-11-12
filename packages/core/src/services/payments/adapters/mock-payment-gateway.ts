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
import { verifyMockPaymentWebhook } from '../mock-webhook-verifier';

interface StoredCheckout {
  input: CreateCheckoutInput;
  result: CreateCheckoutResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNormalizedPaymentEvent(value: unknown): value is NormalizedPaymentEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (typeof value.providerSessionId !== 'string') return false;
  if (value.subjectType === 'vault_answer') {
    if (typeof value.subjectId !== 'string') return false;
  } else if (value.subjectType !== undefined && value.subjectType !== 'booking') {
    return false;
  } else if (typeof value.bookingId !== 'string' && typeof value.subjectId !== 'string') {
    return false;
  }

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
    return (
      (value.providerPaymentId === undefined || typeof value.providerPaymentId === 'string') &&
      typeof value.amountMinor === 'number' &&
      Number.isSafeInteger(value.amountMinor) &&
      value.amountMinor >= 0 &&
      typeof value.currency === 'string' &&
      typeof value.livemode === 'boolean'
    );
  }

  return false;
}

function stableIdempotencyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 24);
}

export class MockPaymentGateway implements PaymentGateway {
  readonly provider = 'mock' as const;
  private readonly checkouts = new Map<string, StoredCheckout>();
  private readonly checkoutByIdempotencyKey = new Map<string, StoredCheckout>();
  private readonly checkoutEvents = new Map<string, NormalizedPaymentEvent>();
  private readonly refunds = new Map<string, RefundInput>();

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const subjectId = input.subjectId ?? input.bookingId;
    if (!subjectId || (input.subjectType === 'vault_answer' && !input.subjectId)) {
      throw new Error('A checkout subject is required.');
    }
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
        url: input.subjectType === 'vault_answer'
          ? `/mock-payment/vault-checkout/${subjectId}`
          : `/mock-payment/checkout/${subjectId}`,
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

  async verifyWebhook(_raw: string, headers: Headers): Promise<boolean> {
    return verifyMockPaymentWebhook(_raw, headers);
  }

  parseWebhook(raw: string, headers: Headers): NormalizedPaymentEvent | null {
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
      ...this.eventSubjectFields(checkout.input),
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
      ...this.eventSubjectFields(checkout.input),
      providerSessionId,
      amountMinor: checkout.input.amountMinor,
      currency: checkout.input.currency,
      livemode: false,
    };
    this.storeTerminalEvent(event);
    return event;
  }

  failCheckout(providerSessionId: string, providerPaymentId?: string): CheckoutFailedEvent {
    const checkout = this.requireCheckout(providerSessionId);
    const event: CheckoutFailedEvent = {
      type: 'checkout.failed',
      ...this.eventSubjectFields(checkout.input),
      providerSessionId,
      ...(providerPaymentId === undefined ? {} : { providerPaymentId }),
      amountMinor: checkout.input.amountMinor,
      currency: checkout.input.currency,
      livemode: false,
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
      (left.subjectType ?? 'booking') === (right.subjectType ?? 'booking') &&
      (left.subjectId ?? left.bookingId) === (right.subjectId ?? right.bookingId) &&
      left.amountMinor === right.amountMinor &&
      left.currency === right.currency &&
      left.idempotencyKey === right.idempotencyKey
    );
  }

  private eventSubjectFields(input: CreateCheckoutInput): Pick<NormalizedPaymentEvent, 'bookingId' | 'subjectType' | 'subjectId'> {
    const subjectId = input.subjectId ?? input.bookingId;
    if (input.subjectType === 'vault_answer') return { subjectType: 'vault_answer', subjectId };
    return { bookingId: subjectId };
  }
}
