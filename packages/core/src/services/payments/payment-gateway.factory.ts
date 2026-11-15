import { getPaymentSettings } from '../../config/env';
import type { PaymentGateway } from './payment-gateway.port';
import { MockPaymentGateway } from './adapters/mock-payment-gateway';
import { StripePaymentGateway } from './adapters/stripe-payment-gateway';

export function createConfiguredPaymentGateway(): PaymentGateway {
  const settings = getPaymentSettings();
  return settings.PAYMENTS_MODE === 'stripe'
    ? new StripePaymentGateway(settings)
    : new MockPaymentGateway();
}

/** Selects verification using the same lazy provider configuration as the application container. */
export async function verifyConfiguredPaymentWebhook(raw: string, headers: Headers): Promise<boolean> {
  return createConfiguredPaymentGateway().verifyWebhook(raw, headers);
}
