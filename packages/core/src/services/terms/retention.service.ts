import type { RetentionRepository } from '@devmentor/db';
import { requireOperator } from '../../http/auth';
import { ConflictError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { parseOrThrow } from '../../validators/parse';
import { retentionHoldCreateSchema, retentionHoldReleaseSchema } from '../../validators/terms/retention.schema';

export class RetentionService {
  constructor(private readonly dependencies: { retentionRepository: RetentionRepository; clock: Clock }) {}

  async list(session: Session) {
    requireOperator(session);
    return this.dependencies.retentionRepository.listLegalHolds();
  }

  async listRuns(session: Session) {
    requireOperator(session);
    return this.dependencies.retentionRepository.listSweepRuns(50);
  }

  async createHold(session: Session, input: unknown) {
    requireOperator(session);
    const data = parseOrThrow(retentionHoldCreateSchema, input);
    try {
      return await this.dependencies.retentionRepository.addLegalHold({ ...data, createdBy: session.userId, at: this.dependencies.clock.now() });
    } catch (error) {
      if (error instanceof Error && error.name === 'StatusTransitionConflictError') throw new ConflictError(error.message);
      throw error;
    }
  }

  async releaseHold(session: Session, id: string, input: unknown) {
    requireOperator(session);
    const data = parseOrThrow(retentionHoldReleaseSchema, input);
    const released = await this.dependencies.retentionRepository.releaseLegalHold({ id, reason: data.reason, releasedBy: session.userId, at: this.dependencies.clock.now() });
    if (!released) throw new ConflictError('This hold is missing or has already been released.');
    return { released: true };
  }
}
