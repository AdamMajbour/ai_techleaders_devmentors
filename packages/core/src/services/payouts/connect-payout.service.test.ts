import { ConflictError } from '../../http/errors';
import { ConnectPayoutService } from './connect-payout.service';

const mentorId = '00000000-0000-4000-8000-000000000001';
const operatorId = '00000000-0000-4000-8000-000000000002';

function setup(options: { accepted?: boolean } = {}) {
  let account: { userId: string; stripeAccountId: string; country: 'PL'; detailsSubmitted: boolean; payoutsEnabled: boolean; transfersEnabled: boolean; checkedAt: Date | null } | null = null;
  const credit = { ledgerEntryId: '00000000-0000-4000-8000-000000000003', mentorId, amountMinor: 800, currency: 'PLN' };
  const allocation = { id: '00000000-0000-4000-8000-000000000004', ...credit, stripeTransferId: null, status: 'pending' as const, failureCode: null, attempts: 0, idempotencyKey: 'credit-3', initiatedBy: operatorId, createdAt: new Date(), updatedAt: new Date() };
  const repository = {
    connectAccount: jest.fn(async () => account),
    saveConnectAccount: jest.fn(async (_userId: string, stripeAccountId: string) => { account = { userId: mentorId, stripeAccountId, country: 'PL', detailsSubmitted: false, payoutsEnabled: false, transfersEnabled: false, checkedAt: null }; }),
    updateConnectStatus: jest.fn(async (input: { userId: string; detailsSubmitted: boolean; payoutsEnabled: boolean; transfersEnabled: boolean; checkedAt: Date }) => { account = { ...input, stripeAccountId: 'acct_test_1', country: 'PL' }; }),
    eligibleCredits: jest.fn(async () => [credit]),
    createPayoutAllocation: jest.fn(async () => allocation),
    markPayoutAttempt: jest.fn(async () => undefined),
    payoutsForMentor: jest.fn(async () => []),
  };
  const gateway = {
    createExpressAccount: jest.fn(async () => 'acct_test_1'),
    createOnboardingLink: jest.fn(async () => 'https://connect.stripe.test/onboard'),
    accountStatus: jest.fn(async () => ({ detailsSubmitted: true, payoutsEnabled: true, transfersEnabled: true })),
    createTransfer: jest.fn(async () => 'tr_test_1'),
    retrieveTransfer: jest.fn(async () => ({ id: 'tr_test_1', reversed: false })),
  };
  const service = new ConnectPayoutService({
    repository: repository as never,
    gateway,
    invitationService: { isAcceptedMentor: jest.fn(async () => true) } as never,
    userRepository: { findById: jest.fn(async () => ({ email: 'mentor@example.test' })) } as never,
    termsService: { hasAcceptedCurrent: jest.fn(async () => options.accepted ?? true) } as never,
    clock: { now: () => new Date('2026-11-12T12:00:00.000Z') },
  });
  return { service, repository, gateway };
}

describe('ConnectPayoutService', () => {
  it('requires current mentor terms and starts Express onboarding', async () => {
    const blocked = setup({ accepted: false });
    await expect(blocked.service.startOnboarding({ userId: mentorId })).rejects.toBeInstanceOf(ConflictError);
    expect(blocked.gateway.createExpressAccount).not.toHaveBeenCalled();

    const ready = setup();
    await expect(ready.service.startOnboarding({ userId: mentorId })).resolves.toEqual({ url: 'https://connect.stripe.test/onboard' });
    expect(ready.gateway.createExpressAccount).toHaveBeenCalledWith({ userId: mentorId, email: 'mentor@example.test' });
  });

  it('rechecks Connect readiness and transfers only the stable ledger credit', async () => {
    const deps = setup();
    const previous = process.env.OPERATOR_USER_IDS;
    process.env.OPERATOR_USER_IDS = operatorId;
    try {
      await deps.service.startOnboarding({ userId: mentorId });
      await expect(deps.service.runBatch({ userId: operatorId }, 10)).resolves.toEqual({ examined: 1, paid: 1, failed: 0, skipped: 0 });
      expect(deps.gateway.accountStatus).toHaveBeenCalledWith('acct_test_1');
      expect(deps.gateway.createTransfer).toHaveBeenCalledWith(expect.objectContaining({ stripeAccountId: 'acct_test_1', amountMinor: 800, idempotencyKey: 'credit-3', ledgerEntryId: '00000000-0000-4000-8000-000000000003' }));
      expect(deps.repository.markPayoutAttempt).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid', stripeTransferId: 'tr_test_1' }));
    } finally {
      if (previous === undefined) delete process.env.OPERATOR_USER_IDS;
      else process.env.OPERATOR_USER_IDS = previous;
    }
  });
});
