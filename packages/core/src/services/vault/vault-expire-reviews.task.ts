import type { VaultAnswerRepository } from '@devmentor/db';
import type { Clock } from '../../utils/clock';
import type { EventBus } from '../../events/event-bus';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'findExpiredPreviews' | 'transitionWithPaymentRefund'>;
  clock: Clock;
  eventBus: EventBus;
};

export class VaultExpireReviewsTask {
  readonly name = 'vault-answers.expire-reviews';
  readonly taskClass = 'db' as const;

  constructor(private readonly dependencies: Dependencies) {}

  async run({ limit }: { limit: number }): Promise<{ processed: number }> {
    const answers = await this.dependencies.vaultAnswerRepository.findExpiredPreviews(this.dependencies.clock.now(), limit);
    let processed = 0;
    for (const answer of answers) {
      const changed = await this.dependencies.vaultAnswerRepository.transitionWithPaymentRefund(answer.id, ['pending_preview'], 'expired', this.dependencies.clock.now());
      if (!changed.changed) continue;
      await this.dependencies.eventBus.emit('vault.answer.expired', { answerId: answer.id });
      processed += 1;
    }
    return { processed };
  }
}
