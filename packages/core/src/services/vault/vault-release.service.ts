import type { VaultAnswerRepository, PaymentRepository, LedgerEntryRepository } from '@devmentor/db';
import type { UnitOfWork } from '../../workflow/unit-of-work.port';
import type { EventBus } from '../../events/event-bus';
import type { Clock } from '../../utils/clock';
import { shareOf, splitEqually } from '../../utils/money';
import { MENTOR_SHARE_BP } from '../../constants';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'findById' | 'findCitations' | 'releaseOrRefund'>;
  paymentRepository: Pick<PaymentRepository, 'findByVaultAnswerId'>;
  ledgerEntryRepository: Pick<LedgerEntryRepository, 'record'>;
  unitOfWork: UnitOfWork;
  eventBus: EventBus;
  clock: Clock;
};

export class VaultReleaseService {
  constructor(private readonly dependencies: Dependencies) {}

  async release(answerId: string): Promise<boolean> {
    const result = await this.dependencies.unitOfWork.run(async () => {
      const answer = await this.dependencies.vaultAnswerRepository.findById(answerId);
      if (!answer) return { released: false, refundRequested: false };
      if (answer.status === 'released') return { released: false, refundRequested: false };
      const citations = await this.dependencies.vaultAnswerRepository.findCitations(answerId);
      const mentors = [...new Map(citations.map((citation) => [citation.mentorId, citation])).values()];
      if (mentors.length === 0) return { released: false, refundRequested: false };
      const payment = await this.dependencies.paymentRepository.findByVaultAnswerId(answerId);
      if (!payment || payment.status !== 'succeeded') return { released: false, refundRequested: false };
      const credited = shareOf(answer.priceMinor, MENTOR_SHARE_BP);
      const shares = splitEqually(credited, mentors.length);
      const released = await this.dependencies.vaultAnswerRepository.releaseOrRefund(answerId, citations.map((citation) => citation.noteId), this.dependencies.clock.now());
      if (!released.released) return { released: false, refundRequested: released.refundRequested };
      await this.dependencies.ledgerEntryRepository.record(mentors.map((mentor, index) => ({
        accountId: mentor.mentorId,
        amountMinor: shares[index] ?? 0,
        currency: answer.currency,
        livemode: payment.livemode,
        sourceType: 'vault_answer',
        sourceId: answerId,
      })));
      return { released: true, refundRequested: false };
    });
    if (result.refundRequested) await this.dependencies.eventBus.emit('vault.answer.rejected', { answerId });
    if (result.released) await this.dependencies.eventBus.emit('vault.answer.released', { answerId });
    return result.released;
  }
}
