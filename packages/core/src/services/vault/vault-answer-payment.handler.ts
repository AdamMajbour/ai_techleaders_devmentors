import type { VaultAnswerRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Clock } from '../../utils/clock';
import { isPreviewRequired } from '../../constants/pilot';
import type { PaymentSubjectHandler } from '../payments/payment.service';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'findById' | 'transition'>;
  eventBus: EventBus;
  clock: Clock;
};

export class VaultAnswerPaymentHandler implements PaymentSubjectHandler {
  readonly type = 'vault_answer' as const;

  constructor(private readonly dependencies: Dependencies) {}

  async expectedAmount(subjectId: string): Promise<{ amountMinor: number; currency: string } | null> {
    const answer = await this.dependencies.vaultAnswerRepository.findById(subjectId);
    if (!answer) return null;
    return { amountMinor: answer.priceMinor, currency: answer.currency };
  }

  async onPaid(subjectId: string, paymentId: string): Promise<void> {
    void paymentId;
    const changed = await this.dependencies.vaultAnswerRepository.transition(
      subjectId,
      ['pending_payment'],
      'paid',
      { kind: 'webhook' },
      { previewRequired: isPreviewRequired(this.dependencies.clock) },
      true,
    );
    if (changed) await this.dependencies.eventBus.emit('vault.answer.paid', { answerId: subjectId });
  }

  async onFailed(subjectId: string, paymentId: string): Promise<void> {
    void paymentId;
    await this.dependencies.vaultAnswerRepository.transition(
      subjectId,
      ['pending_payment'],
      'payment_failed',
      { kind: 'webhook' },
      {},
      true,
    );
  }
}
