import type { RetentionRepository } from '@devmentor/db';
import type { UnitOfWork } from '../../workflow/unit-of-work.port';
import type { Clock } from '../../utils/clock';

// 2027-01-13 23:59:59 Europe/Warsaw (UTC+01:00 in January), per D15 and D18.
export const PILOT_RETENTION_DEADLINE = new Date('2027-01-13T22:59:59.000Z');

export class RetentionSweepTask {
  readonly name = 'pilot-content.retention-sweep';
  readonly taskClass = 'db' as const;

  constructor(private readonly dependencies: {
    retentionRepository: Pick<RetentionRepository, 'erasePilotContent' | 'startSweepRun' | 'finishSweepRun'>;
    unitOfWork: UnitOfWork;
    clock: Clock;
  }) {}

  async run(context: { limit: number }): Promise<{ processed: number; deleted: Awaited<ReturnType<RetentionRepository['erasePilotContent']>> }> {
    if (this.dependencies.clock.now().getTime() < PILOT_RETENTION_DEADLINE.getTime()) {
      return { processed: 0, deleted: { messages: 0, bookingQuestions: 0, notes: 0, vaultQuestions: 0, vaultAnswers: 0, citations: 0, skippedHolds: 0 } };
    }
    const limit = Math.max(1, Math.min(1000, Math.floor(context.limit) || 100));
    const startedAt = this.dependencies.clock.now();
    const runId = await this.dependencies.retentionRepository.startSweepRun({ startedAt, limitCount: limit });
    try {
      const deleted = await this.dependencies.unitOfWork.run(() => this.dependencies.retentionRepository.erasePilotContent(limit));
      const { skippedHolds, ...erased } = deleted;
      const processed = Object.values(erased).reduce((sum, count) => sum + count, 0);
      await this.dependencies.retentionRepository.finishSweepRun({ id: runId, status: 'completed', completedAt: this.dependencies.clock.now(), processedCount: processed, skippedHoldCount: skippedHolds, errorCode: null });
      return { processed, deleted };
    } catch (error) {
      await this.dependencies.retentionRepository.finishSweepRun({ id: runId, status: 'failed', completedAt: this.dependencies.clock.now(), processedCount: 0, skippedHoldCount: 0, errorCode: 'retention_sweep_failed' });
      throw error;
    }
  }
}
