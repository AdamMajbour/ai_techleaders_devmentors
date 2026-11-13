import type { ConnectPayoutRepository, UserRepository } from '@devmentor/db';
import { requireOperator } from '../../http/auth';
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from '../auth/invitation.service';
import type { TermsService } from '../terms/terms.service';
import type { StripeConnectPort } from './stripe-connect.port';

export class ConnectPayoutService {
  constructor(private readonly dependencies: {
    repository: ConnectPayoutRepository;
    gateway: StripeConnectPort;
    invitationService: Pick<InvitationService, 'isAcceptedMentor'>;
    userRepository: Pick<UserRepository, 'findById'>;
    termsService: Pick<TermsService, 'hasAcceptedCurrent'>;
    clock: Clock;
  }) {}

  async startOnboarding(session: Session | null) {
    const mentorId = await this.requireMentor(session);
    if (!(await this.dependencies.termsService.hasAcceptedCurrent(mentorId, 'mentor'))) {
      throw new ConflictError('Accept the current mentor pilot terms before setting up payouts.');
    }
    let account = await this.dependencies.repository.connectAccount(mentorId);
    if (!account) {
      const user = await this.dependencies.userRepository.findById(mentorId);
      if (!user?.email) throw new NotFoundError('A verified email is required for Stripe onboarding.');
      let stripeAccountId: string;
      try {
        stripeAccountId = await this.dependencies.gateway.createExpressAccount({ userId: mentorId, email: user.email });
      } catch {
        throw new AppError('Stripe Express onboarding is unavailable. Configure Stripe Connect with a test key.', 'connect_unavailable', 503);
      }
      await this.dependencies.repository.saveConnectAccount(mentorId, stripeAccountId, this.dependencies.clock.now());
      account = await this.dependencies.repository.connectAccount(mentorId);
    }
    if (!account) throw new ConflictError('The connected account could not be saved.');
    try {
      return { url: await this.dependencies.gateway.createOnboardingLink(account.stripeAccountId) };
    } catch {
      throw new AppError('Stripe Express onboarding is unavailable. Try again later.', 'connect_unavailable', 503);
    }
  }

  async status(session: Session | null) {
    const mentorId = await this.requireMentor(session);
    const account = await this.dependencies.repository.connectAccount(mentorId);
    const [payouts, credits, acceptedTerms] = await Promise.all([
      this.dependencies.repository.payoutsForMentor(mentorId),
      this.dependencies.repository.creditSummary(mentorId),
      this.dependencies.termsService.hasAcceptedCurrent(mentorId, 'mentor'),
    ]);
    if (!account) return { account: null, ready: false, totals: this.totals(payouts, credits, false), payouts: this.toDto(payouts) };
    let status: Awaited<ReturnType<StripeConnectPort['accountStatus']>>;
    try {
      status = await this.dependencies.gateway.accountStatus(account.stripeAccountId);
    } catch {
      throw new AppError('Stripe Connect status is unavailable. Try again later.', 'connect_unavailable', 503);
    }
    await this.dependencies.repository.updateConnectStatus({ userId: mentorId, ...status, checkedAt: this.dependencies.clock.now() });
    const ready = status.detailsSubmitted && status.payoutsEnabled && status.transfersEnabled && acceptedTerms;
    return { account: { country: 'PL', type: 'express', ...status }, ready, totals: this.totals(payouts, credits, ready && acceptedTerms), payouts: this.toDto(payouts) };
  }

  async runBatch(session: Session, limit = 50) {
    requireOperator(session);
    const credits = await this.dependencies.repository.eligibleCredits(limit);
    const accountStatuses = new Map<string, Awaited<ReturnType<StripeConnectPort['accountStatus']>> | null>();
    let paid = 0;
    let skipped = 0;
    let failed = 0;
    for (const credit of credits) {
      if (!(await this.dependencies.termsService.hasAcceptedCurrent(credit.mentorId, 'mentor'))) { skipped += 1; continue; }
      const account = await this.dependencies.repository.connectAccount(credit.mentorId);
      if (!account) { skipped += 1; continue; }
      let status = accountStatuses.get(credit.mentorId);
      if (status === undefined) {
        try { status = await this.dependencies.gateway.accountStatus(account.stripeAccountId); }
        catch { status = null; }
        accountStatuses.set(credit.mentorId, status);
      }
      if (!status?.detailsSubmitted || !status.payoutsEnabled || !status.transfersEnabled) { skipped += 1; continue; }
      await this.dependencies.repository.updateConnectStatus({ userId: credit.mentorId, ...status, checkedAt: this.dependencies.clock.now() });
      const allocation = await this.dependencies.repository.createPayoutAllocation({ credit, initiatedBy: session.userId, at: this.dependencies.clock.now() });
      if (allocation.status === 'paid') continue;
      try {
        if (allocation.stripeTransferId) {
          const transfer = await this.dependencies.gateway.retrieveTransfer(allocation.stripeTransferId);
          await this.dependencies.repository.markPayoutAttempt({ id: allocation.id, attemptedBy: session.userId, status: transfer.reversed ? 'failed' : 'paid', stripeTransferId: transfer.id, failureCode: transfer.reversed ? 'transfer_reversed' : undefined, at: this.dependencies.clock.now() });
          if (transfer.reversed) failed += 1; else paid += 1;
          continue;
        }
        const stripeTransferId = await this.dependencies.gateway.createTransfer({
          stripeAccountId: account.stripeAccountId, amountMinor: allocation.amountMinor, currency: allocation.currency,
          idempotencyKey: allocation.idempotencyKey, ledgerEntryId: allocation.ledgerEntryId,
        });
        await this.dependencies.repository.markPayoutAttempt({ id: allocation.id, attemptedBy: session.userId, status: 'paid', stripeTransferId, at: this.dependencies.clock.now() });
        paid += 1;
      } catch {
        await this.dependencies.repository.markPayoutAttempt({ id: allocation.id, attemptedBy: session.userId, status: 'failed', failureCode: 'connect_transfer_failed', at: this.dependencies.clock.now() });
        failed += 1;
      }
    }
    return { examined: credits.length, paid, failed, skipped };
  }

  async operatorHistory(session: Session) {
    requireOperator(session);
    return (await this.dependencies.repository.allPayouts(200)).map((row) => ({ id: row.id, mentorId: row.mentorId, sourceId: row.ledgerEntryId, amountMinor: row.amountMinor, currency: row.currency, status: row.status, failureCode: row.failureCode, attempts: row.attempts, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
  }

  private async requireMentor(session: Session | null): Promise<string> {
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.dependencies.invitationService.isAcceptedMentor(session.userId))) throw new ForbiddenError();
    return session.userId;
  }

  private totals(rows: Awaited<ReturnType<ConnectPayoutRepository['payoutsForMentor']>>, credits: { earnedMinor: number; paidMinor: number }, canReceiveTransfers: boolean) {
    const transferTotals = rows.reduce((result, row) => {
      result[row.status] += row.amountMinor;
      return result;
    }, { paid: 0, pending: 0, failed: 0 });
    const paid = credits.paidMinor;
    const pending = Math.max(0, credits.earnedMinor - paid);
    return { paid, pending, failed: transferTotals.failed, blocked: canReceiveTransfers ? 0 : pending };
  }

  private toDto(rows: Awaited<ReturnType<ConnectPayoutRepository['payoutsForMentor']>>) {
    return rows.map((row) => ({ id: row.id, sourceId: row.ledgerEntryId, amountMinor: row.amountMinor, currency: row.currency, status: row.status, failureCode: row.failureCode, createdAt: row.createdAt.toISOString() }));
  }
}
