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
}

export interface CheckoutFailedEvent {
  type: 'checkout.failed';
  bookingId: string;
  providerSessionId: string;
  providerPaymentId?: string;
}

export type NormalizedPaymentEvent =
  | CheckoutCompletedEvent
  | CheckoutExpiredEvent
  | CheckoutFailedEvent;

export interface PaymentGateway {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  refund(input: RefundInput): Promise<void>;
  parseWebhook(raw: string, headers: Headers): NormalizedPaymentEvent;
  getCheckout(providerSessionId: string): Promise<NormalizedPaymentEvent | null>;
}
