import { StripeConnectGateway } from './stripe-connect-gateway';

describe('StripeConnectGateway', () => {
  function setup(enabled = true) {
    const accountsCreate = jest.fn().mockResolvedValue({ id: 'acct_test_1' });
    const accountsRetrieve = jest.fn().mockResolvedValue({ details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' } });
    const linksCreate = jest.fn().mockResolvedValue({ url: 'https://connect.stripe.test/onboard' });
    const transfersCreate = jest.fn().mockResolvedValue({ id: 'tr_test_1' });
    const transfersRetrieve = jest.fn().mockResolvedValue({ id: 'tr_test_1', reversed: false });
    const createClient = jest.fn(() => ({ accounts: { create: accountsCreate, retrieve: accountsRetrieve }, accountLinks: { create: linksCreate }, transfers: { create: transfersCreate, retrieve: transfersRetrieve } } as never));
    const settings = { PAYMENTS_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_example123', STRIPE_WEBHOOK_SECRET: 'whsec_example123', PAYMENTS_LIVE_ENABLED: false, STRIPE_CONNECT_ENABLED: enabled } as const;
    return { gateway: new StripeConnectGateway(settings, createClient, () => 'https://devmentor.test'), createClient, accountsCreate, accountsRetrieve, linksCreate, transfersCreate, transfersRetrieve };
  }

  it('creates Poland Express accounts and hosted onboarding links', async () => {
    const deps = setup();
    await expect(deps.gateway.createExpressAccount({ userId: 'mentor-1', email: 'mentor@example.test' })).resolves.toBe('acct_test_1');
    expect(deps.accountsCreate).toHaveBeenCalledWith(expect.objectContaining({ type: 'express', country: 'PL', email: 'mentor@example.test', metadata: { devmentor_user_id: 'mentor-1' } }));
    await expect(deps.gateway.createOnboardingLink('acct_test_1')).resolves.toBe('https://connect.stripe.test/onboard');
    expect(deps.linksCreate).toHaveBeenCalledWith(expect.objectContaining({ account: 'acct_test_1', type: 'account_onboarding', return_url: 'https://devmentor.test/mentor/payouts?onboarding=complete' }));
  });

  it('uses stable idempotency for transfers and reads connected-account readiness', async () => {
    const deps = setup();
    await expect(deps.gateway.accountStatus('acct_test_1')).resolves.toEqual({ detailsSubmitted: true, payoutsEnabled: true, transfersEnabled: true });
    await expect(deps.gateway.createTransfer({ stripeAccountId: 'acct_test_1', amountMinor: 500, currency: 'EUR', idempotencyKey: 'pilot-credit-1', ledgerEntryId: 'ledger-1' })).resolves.toBe('tr_test_1');
    expect(deps.transfersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 500, destination: 'acct_test_1', metadata: { devmentor_ledger_entry_id: 'ledger-1' } }), { idempotencyKey: 'pilot-credit-1' });
    await expect(deps.gateway.retrieveTransfer('tr_test_1')).resolves.toEqual({ id: 'tr_test_1', reversed: false });
  });

  it('fails closed when Connect test mode is disabled', async () => {
    const deps = setup(false);
    await expect(deps.gateway.createExpressAccount({ userId: 'mentor-1', email: 'mentor@example.test' })).rejects.toThrow(/disabled or is not configured for test mode/i);
    expect(deps.createClient).not.toHaveBeenCalled();
  });
});
