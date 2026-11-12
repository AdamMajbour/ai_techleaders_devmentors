import type { VaultAnswerRepository, PaymentRepository, NoteRepository, LedgerEntryRepository } from '@devmentor/db';
import type { UnitOfWork } from '../../workflow/unit-of-work.port';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { vaultAnswerStateMachine } from '../../workflow/vault-answer-state-machine';
import { vaultAnswerDtoSchema, type VaultAnswerDto } from '../../validators/vault/vault-answer.schema';
import { shareOf, splitEqually } from '../../utils/money';
import { MENTOR_SHARE_BP } from '../../constants';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'findById' | 'findPreviewsForMentor' | 'findReviewFor' | 'findReviews' | 'findCitations' | 'decideReviewAndTransition' | 'decideAndReleaseWithCredits' | 'transitionWithPaymentRefund' | 'findOperatorAnswers'>;
  paymentRepository: Pick<PaymentRepository, 'findByVaultAnswerId'>;
  ledgerEntryRepository: Pick<LedgerEntryRepository, 'record'>;
  noteRepository: Pick<NoteRepository, 'findById'>;
  vaultReleaseService: { release(answerId: string): Promise<boolean> };
  unitOfWork: UnitOfWork;
  eventBus: EventBus;
  clock: Clock;
};

export class VaultReviewService {
  constructor(private readonly dependencies: Dependencies) {}

  async list(actor: Session): Promise<{ items: VaultAnswerDto[]; serverTime: string }> {
    const items = await this.dependencies.vaultAnswerRepository.findPreviewsForMentor(actor.userId);
    return { serverTime: this.dependencies.clock.now().toISOString(), items: await Promise.all(items.map(async ({ answer, review }) => {
      const citations = await this.dependencies.vaultAnswerRepository.findCitations(answer.id);
      return this.toDto(answer, review.decision === null, citations.filter((citation) => citation.mentorId === actor.userId).map((citation) => citation.noteTitle)[0] ?? 'your note', [...new Set(citations.filter((citation) => citation.mentorId !== actor.userId).map((citation) => citation.mentorName))]);
    })) };
  }

  async decide(actor: Session, answerId: string, decision: 'approve' | 'reject', reason?: string): Promise<{ id: string; status: string }> {
    const result = await this.dependencies.unitOfWork.run(async () => {
      const review = await this.dependencies.vaultAnswerRepository.findReviewFor(answerId, actor.userId);
      if (!review) throw new ForbiddenError();
      const answer = await this.dependencies.vaultAnswerRepository.findById(answerId);
      if (!answer || answer.status !== 'pending_preview') throw new ConflictError('This answer is no longer awaiting preview.');
      if (answer.reviewExpiresAt && answer.reviewExpiresAt <= this.dependencies.clock.now()) throw new ConflictError('The preview deadline has passed.');
      const citations = await this.dependencies.vaultAnswerRepository.findCitations(answerId);
      const noteStatuses = await Promise.all(citations.map((citation) => this.dependencies.noteRepository.findById(citation.noteId)));
      if (noteStatuses.some((note) => !note || note.status !== 'published')) decision = 'reject';
      const currentReviews = await this.dependencies.vaultAnswerRepository.findReviews(answerId);
      const nextDecision = decision === 'approve' ? 'approved' : 'rejected';
      const rejectedAfter = currentReviews.some((item) => item.decision === 'rejected') || nextDecision === 'rejected';
      const allApprovedAfter = currentReviews.length > 0 && currentReviews.every((item) =>
        item.reviewerId === actor.userId ? nextDecision === 'approved' : item.decision === 'approved',
      );
      if (allApprovedAfter && !rejectedAfter) {
        const [payment, citations] = await Promise.all([
          this.dependencies.paymentRepository.findByVaultAnswerId(answerId),
          this.dependencies.vaultAnswerRepository.findCitations(answerId),
        ]);
        if (!payment || payment.status !== 'succeeded') throw new ConflictError('The payment is not settled.');
        const mentors = [...new Map(citations.map((citation) => [citation.mentorId, citation])).values()];
        const shares = splitEqually(shareOf(answer.priceMinor, MENTOR_SHARE_BP), mentors.length);
        const released = await this.dependencies.vaultAnswerRepository.decideAndReleaseWithCredits({
          answerId,
          reviewerId: actor.userId,
          decidedAt: this.dependencies.clock.now(),
          credits: mentors.map((mentor, index) => ({ accountId: mentor.mentorId, amountMinor: shares[index] ?? 0, currency: answer.currency, livemode: payment.livemode, sourceType: 'vault_answer', sourceId: answerId })),
        });
        const committed = await this.dependencies.vaultAnswerRepository.findById(answerId);
        return { rejected: committed?.status === 'rejected', allApproved: released, answerId };
      }
      const result = await this.dependencies.vaultAnswerRepository.decideReviewAndTransition({
        answerId,
        reviewerId: actor.userId,
        decision: nextDecision,
        decidedAt: this.dependencies.clock.now(),
        ...(decision === 'reject' && reason ? { reason: reason.slice(0, 500) } : {}),
        ...(rejectedAfter ? { terminal: 'rejected' as const } : allApprovedAfter ? { terminal: 'released' as const } : {}),
      });
      if (!result.changed) throw new ConflictError();
      const rejected = result.reviews.some((item) => item.decision === 'rejected');
      const allApproved = result.reviews.length > 0 && result.reviews.every((item) => item.decision === 'approved');
      return { rejected, allApproved, answerId };
    });
    if (result.rejected) await this.dependencies.eventBus.emit('vault.answer.rejected', { answerId });
    if (result.allApproved) await this.dependencies.eventBus.emit('vault.answer.released', { answerId });
    return { id: answerId, status: result.rejected ? 'rejected' : result.allApproved ? 'released' : 'pending_preview' };
  }

  async operatorList(actor: Session): Promise<{ items: Array<{ id: string; status: string; failureReason: string | null; rejectionReasons: string[]; refundStatus: string; createdAt: string }> }> {
    const { requireOperator } = await import('../../http/auth');
    requireOperator(actor);
    const rows = await this.dependencies.vaultAnswerRepository.findOperatorAnswers(100);
    const items = await Promise.all(rows.map(async ({ answer, rejectionReasons }) => {
      const payment = await this.dependencies.paymentRepository.findByVaultAnswerId(answer.id);
      return {
        id: answer.id,
        status: answer.status,
        failureReason: answer.failureReason ?? null,
        rejectionReasons,
        refundStatus: payment?.status ?? 'none',
        createdAt: answer.createdAt.toISOString(),
      };
    }));
    return { items };
  }

  async cancel(actor: Session, answerId: string): Promise<{ id: string; status: 'cancelled' }> {
    const { requireOperator } = await import('../../http/auth');
    requireOperator(actor);
    const answer = await this.dependencies.vaultAnswerRepository.findById(answerId);
    if (!answer) throw new NotFoundError();
    const changed = await this.dependencies.vaultAnswerRepository.transitionWithPaymentRefund(answerId, ['paid', 'generating', 'pending_preview'], 'cancelled', this.dependencies.clock.now());
    if (!changed.changed && answer.status !== 'cancelled') throw new ConflictError();
    return { id: answerId, status: 'cancelled' };
  }

  private async toDto(answer: NonNullable<Awaited<ReturnType<Dependencies['vaultAnswerRepository']['findById']>>>, canDecide: boolean, ownNoteTitle: string, otherMentors: string[]): Promise<VaultAnswerDto> {
    if (!answer) throw new NotFoundError();
    const raw = {
      id: answer.id,
      status: answer.status as VaultAnswerDto['status'],
      question: answer.question,
      answerText: answer.answerText ?? undefined,
      priceMinor: answer.priceMinor,
      currency: answer.currency,
      createdAt: answer.createdAt.toISOString(),
      updatedAt: answer.updatedAt.toISOString(),
      canDecide,
      ...(answer.reviewExpiresAt ? { reviewExpiresAt: answer.reviewExpiresAt.toISOString() } : {}),
      ownNoteTitle,
      otherMentors,
      allowedActions: canDecide ? ['approve', 'reject'] : [],
    };
    return vaultAnswerDtoSchema.parse(vaultAnswerStateMachine.pickVisible(raw, answer.status as VaultAnswerDto['status'], 'assignee'));
  }
}
