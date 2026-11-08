import { isMockPaymentInteractionEnabled } from './mock-payment';

describe('mock payment interaction guard', () => {
  const env = process.env as Record<string, string | undefined>;
  const original = {
    nodeEnv: env.NODE_ENV,
    paymentsMode: env.PAYMENTS_MODE,
    e2eEnabled: env.MOCK_PAYMENT_E2E_ENABLED,
    jestWorkerId: env.JEST_WORKER_ID,
  };

  afterEach(() => {
    if (original.nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = original.nodeEnv;
    if (original.paymentsMode === undefined) delete env.PAYMENTS_MODE;
    else env.PAYMENTS_MODE = original.paymentsMode;
    if (original.e2eEnabled === undefined) delete env.MOCK_PAYMENT_E2E_ENABLED;
    else env.MOCK_PAYMENT_E2E_ENABLED = original.e2eEnabled;
    if (original.jestWorkerId === undefined) delete env.JEST_WORKER_ID;
    else env.JEST_WORKER_ID = original.jestWorkerId;
  });

  it('allows the interactive mock only outside production or in an explicitly opted-in Jest E2E server', () => {
    env.NODE_ENV = 'development';
    env.PAYMENTS_MODE = 'mock';
    expect(isMockPaymentInteractionEnabled()).toBe(true);

    env.NODE_ENV = 'production';
    delete env.MOCK_PAYMENT_E2E_ENABLED;
    delete env.JEST_WORKER_ID;
    expect(isMockPaymentInteractionEnabled()).toBe(false);

    env.MOCK_PAYMENT_E2E_ENABLED = 'true';
    env.JEST_WORKER_ID = '1';
    expect(isMockPaymentInteractionEnabled()).toBe(true);

    env.PAYMENTS_MODE = 'stripe';
    expect(isMockPaymentInteractionEnabled()).toBe(false);
  });
});
