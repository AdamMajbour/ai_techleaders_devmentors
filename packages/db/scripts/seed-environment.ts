export type SeedEnvironment = {
  NODE_ENV?: string;
  DATABASE_NAME?: string;
  PAYMENTS_MODE?: string;
  MOCK_PAYMENT_E2E_ENABLED?: string;
};

export function assertDemoSeedAllowed(environment: SeedEnvironment): void {
  const isIsolatedMockE2e = environment.DATABASE_NAME === 'devmentor_e2e'
    && environment.PAYMENTS_MODE === 'mock'
    && environment.MOCK_PAYMENT_E2E_ENABLED === 'true';

  if (environment.NODE_ENV === 'production' && !isIsolatedMockE2e) {
    throw new Error('The local demo seed cannot run against a production database.');
  }
}
