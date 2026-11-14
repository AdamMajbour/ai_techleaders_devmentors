import { assertDemoSeedAllowed } from './seed-environment';

describe('assertDemoSeedAllowed', () => {
  it('rejects production databases', () => {
    expect(() => assertDemoSeedAllowed({
      NODE_ENV: 'production',
      DATABASE_NAME: 'devmentor',
      PAYMENTS_MODE: 'mock',
      MOCK_PAYMENT_E2E_ENABLED: 'true',
    })).toThrow('The local demo seed cannot run against a production database.');
  });

  it('allows the isolated mock-payment E2E database used by the production build tests', () => {
    expect(() => assertDemoSeedAllowed({
      NODE_ENV: 'production',
      DATABASE_NAME: 'devmentor_e2e',
      PAYMENTS_MODE: 'mock',
      MOCK_PAYMENT_E2E_ENABLED: 'true',
    })).not.toThrow();
  });

  it('rejects a production database even when it has the E2E name but mock mode is not enabled', () => {
    expect(() => assertDemoSeedAllowed({
      NODE_ENV: 'production',
      DATABASE_NAME: 'devmentor_e2e',
      PAYMENTS_MODE: 'stripe',
      MOCK_PAYMENT_E2E_ENABLED: 'false',
    })).toThrow('The local demo seed cannot run against a production database.');
  });
});
