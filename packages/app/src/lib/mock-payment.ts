/** Test builds may opt into the mock checkout UI; normal production builds always fail closed. */
export function isMockPaymentInteractionEnabled(): boolean {
  if ((process.env.PAYMENTS_MODE ?? 'mock') !== 'mock') return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.MOCK_PAYMENT_E2E_ENABLED === 'true' && Boolean(process.env.JEST_WORKER_ID);
}
