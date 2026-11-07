import type { WebhookVerification } from '../../http/makeWebhookRoute';

export const MOCK_PAYMENT_SIGNATURE_HEADER = 'x-mock-payment-signature';
export const MOCK_PAYMENT_SIGNATURE_VALUE = 'devmentor-mock';

/** The mock gateway uses an explicit marker, never a production signature implementation. */
export const verifyMockPaymentWebhook: WebhookVerification = async (_rawBody, headers) =>
  process.env.NODE_ENV !== 'production' &&
  headers.get(MOCK_PAYMENT_SIGNATURE_HEADER) === MOCK_PAYMENT_SIGNATURE_VALUE;
