export interface CreateCheckoutInput {
  bookingId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}

export interface CreateCheckoutResult {
  providerSessionId: string;
  url: string;
}

export interface RefundInput {
  providerPaymentId: string;
  amountMinor: number;
  idempotencyKey: string;
}

export interface CheckoutCompletedEvent {
  type: 'checkout.completed';
  bookingId: string;
  providerSessionId: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  livemode?: boolean;
}

export interface CheckoutExpiredEvent {
  type: 'checkout.expired';
  bookingId: string;
  providerSessionId: string;
  providerPaymentId?: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
}

export interface CheckoutFailedEvent {
  type: 'checkout.failed';
  bookingId: string;
  providerSessionId: string;
  providerPaymentId?: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
}

export type NormalizedPaymentEvent =
  | CheckoutCompletedEvent
  | CheckoutExpiredEvent
  | CheckoutFailedEvent;

export interface PaymentGateway {
  readonly provider: 'mock' | 'stripe';
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  refund(input: RefundInput): Promise<void>;
  verifyWebhook(raw: string, headers: Headers): Promise<boolean>;
  parseWebhook(raw: string, headers: Headers): NormalizedPaymentEvent | null;
  getCheckout(providerSessionId: string): Promise<NormalizedPaymentEvent | null>;
}
