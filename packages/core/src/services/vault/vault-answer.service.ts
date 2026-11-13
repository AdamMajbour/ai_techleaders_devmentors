import type { PaymentRepository, VaultAnswer, VaultAnswerRepository } from '@devmentor/db';
import type { VaultSettings } from '../../config/env';
import { CURRENCY, VAULT_ANSWER_PRICE_MINOR, VAULT_MAX_OPEN_ANSWERS, VAULT_PENDING_PAYMENT_MAX_AGE_MS } from '../../constants';
import type { EventBus } from '../../events/event-bus';
import { assertOwns } from '../../http/auth';
import { AppError, ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, UnauthorizedError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import { MockPaymentGateway } from '../payments/adapters/mock-payment-gateway';
import type { PaymentService } from '../payments/payment.service';
import { assertConfiguredAIReadyToCharge } from '../ai/answer-generator.factory';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from '../auth/invitation.service';
import { NoteSelector } from './note-selector';
import { vaultAnswerDtoSchema, vaultAnswerCreateSchema, type VaultAnswerDto } from '../../validators/vault/vault-answer.schema';
import { vaultAnswerStateMachine } from '../../workflow/vault-answer-state-machine';
import type { TermsService } from '../terms/terms.service';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'createWithPayment' | 'findById' | 'findForSeeker' | 'countOpenForSeeker' | 'failCheckout' | 'findCitations' | 'findReviewFor'>;
  paymentRepository: Pick<PaymentRepository, 'setProviderSessionForVaultAnswer' | 'findByVaultAnswerId'>;
  noteSelector: Pick<NoteSelector, 'selectFor'>;
  invitationService: Pick<InvitationService, 'isPilotMember' | 'isAcceptedSeeker' | 'isAcceptedMentor'>;
  paymentGateway: PaymentGateway;
  paymentService: Pick<PaymentService, 'handleEvent'>;
  eventBus: EventBus;
  logger: Logger;
  clock: Clock;
  vaultSettings: () => VaultSettings;
  assertAIReady?: () => void;
  vaultGenerationTask?: { run(input: { limit: number }): Promise<{ processed: number }> };
  termsService?: Pick<TermsService, 'assertReady' | 'assertCurrent' | 'acceptAtCheckout'>;
};

export interface VaultAnswerCreationResult {
  answer: VaultAnswerDto;
  checkoutUrl: string;
}

export class VaultAnswerService {
  private readonly assertAIReady: () => void;

  constructor(private readonly dependencies: Dependencies) {
    this.assertAIReady = dependencies.assertAIReady ?? assertConfiguredAIReadyToCharge;
  }

  async create(session: { userId: string } | null, untrustedInput: unknown): Promise<VaultAnswerCreationResult> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    const parsed = vaultAnswerCreateSchema.safeParse(untrustedInput);
    if (!parsed.success) throw new AppError('The question is invalid.', 'validation_failed', 400);
    if (!(await this.dependencies.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
    if (!(await this.dependencies.invitationService.isAcceptedSeeker(session.userId))) throw new ForbiddenError();

    if (this.dependencies.termsService) await this.dependencies.termsService.assertCurrent('seeker', { versionId: parsed.data.termsVersionId, sha256: parsed.data.termsSha256 });

    try {
      this.assertAIReady();
    } catch {
      throw new AppError('Vault answers are not available right now.', 'ai_configuration', 503);
    }
    const now = this.dependencies.clock.now();
    const notes = await this.dependencies.noteSelector.selectFor(session.userId);
    if (notes.length === 0) throw new ConflictError('No mentor notes are available for this question yet.');
    const openCount = await this.dependencies.vaultAnswerRepository.countOpenForSeeker(
      session.userId,
      now,
      VAULT_PENDING_PAYMENT_MAX_AGE_MS,
    );
    if (openCount >= VAULT_MAX_OPEN_ANSWERS) throw new TooManyRequestsError(60);

    const { answer, payment } = await this.dependencies.vaultAnswerRepository.createWithPayment({
      seekerId: session.userId,
      question: parsed.data.question,
      status: 'pending_payment',
      priceMinor: VAULT_ANSWER_PRICE_MINOR,
      currency: CURRENCY,
      answerText: null,
      failureReason: null,
      modelId: null,
      inputTokens: null,
      outputTokens: null,
      generationAttempts: 0,
      generationStartedAt: null,
      previewRequired: true,
      reviewExpiresAt: null,
    }, {
      provider: this.dependencies.paymentGateway.provider,
      livemode: false,
      providerSessionId: null,
      providerPaymentId: null,
      amountMinor: VAULT_ANSWER_PRICE_MINOR,
      currency: CURRENCY,
      status: 'pending',
    });

    if (this.dependencies.termsService) {
      try {
        await this.dependencies.termsService.acceptAtCheckout(session.userId, 'seeker', 'vault_answer', answer.id, { versionId: parsed.data.termsVersionId, sha256: parsed.data.termsSha256 });
      } catch (error) {
        try { await this.dependencies.vaultAnswerRepository.failCheckout(answer.id); }
        catch (persistenceError) { throw new AggregateError([error, persistenceError], 'Terms consent failed and the vault answer could not be closed.'); }
        throw error;
      }
    }

    let checkout: Awaited<ReturnType<PaymentGateway['createCheckout']>>;
    try {
      checkout = await this.dependencies.paymentGateway.createCheckout({
        subjectType: 'vault_answer',
        subjectId: answer.id,
        amountMinor: VAULT_ANSWER_PRICE_MINOR,
        currency: CURRENCY,
        idempotencyKey: `vault-answer:${answer.id}:checkout`,
      });
      const persistedPayment = await this.dependencies.paymentRepository.setProviderSessionForVaultAnswer(answer.id, checkout.providerSessionId);
      if (!persistedPayment) {
        throw new Error('Pending vault payment was not found.');
      }
      payment.providerSessionId = persistedPayment.providerSessionId;
    } catch {
      await this.dependencies.vaultAnswerRepository.failCheckout(answer.id);
      throw new AppError('The checkout could not be started. No payment was taken.', 'checkout_unavailable', 503);
    }
    await this.dependencies.eventBus.emit('vault.answer.created', { answerId: answer.id, seekerId: session.userId });
    return { answer: await this.toSeekerDto(answer), checkoutUrl: checkout.url };
  }

  async createAndSchedule(session: { userId: string } | null, input: unknown, background?: (task: () => Promise<void>) => void): Promise<VaultAnswerCreationResult> {
    const result = await this.create(session, input);
    if (background) background(async () => {
      const current = await this.dependencies.vaultAnswerRepository.findById(result.answer.id);
      if (current?.status === 'paid' || current?.status === 'generating') await this.runGeneration();
    });
    return result;
  }

  async list(session: { userId: string } | null): Promise<{ items: VaultAnswerDto[]; serverTime: string }> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.dependencies.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
    const answers = await this.dependencies.vaultAnswerRepository.findForSeeker(session.userId);
    return {
      items: await Promise.all(answers.map((answer) => this.toSeekerDto(answer))),
      serverTime: this.dependencies.clock.now().toISOString(),
    };
  }

  async get(session: { userId: string } | null, id: string): Promise<VaultAnswerDto> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.dependencies.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
    const answer = await this.find(id);
    assertOwns(session, answer.seekerId);
    return this.toSeekerDto(await this.find(id));
  }

  async getAndSchedule(session: { userId: string } | null, id: string, background?: (task: () => Promise<void>) => void): Promise<VaultAnswerDto> {
    const dto = await this.get(session, id);
    if (background) background(() => this.runGeneration());
    return dto;
  }

  async getForMentor(session: { userId: string } | null, id: string): Promise<VaultAnswerDto> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.dependencies.invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
    const answer = await this.find(id);
    const review = await this.dependencies.vaultAnswerRepository.findReviewFor(id, session.userId);
    if (!review) throw new NotFoundError();
    const citations = await this.dependencies.vaultAnswerRepository.findCitations(id);
    const raw = {
      id: answer.id, status: answer.status as VaultAnswerDto['status'], question: answer.question,
      answerText: answer.answerText ?? undefined, priceMinor: answer.priceMinor, currency: answer.currency,
      createdAt: answer.createdAt.toISOString(), updatedAt: answer.updatedAt.toISOString(),
      reviewExpiresAt: answer.reviewExpiresAt?.toISOString(),
      ownNoteTitle: citations.find((citation) => citation.mentorId === session.userId)?.noteTitle ?? 'your note',
      otherMentors: [...new Set(citations.filter((citation) => citation.mentorId !== session.userId).map((citation) => citation.mentorName))],
      canDecide: answer.status === 'pending_preview' && review.decision === null,
      allowedActions: answer.status === 'pending_preview' && review.decision === null ? ['approve', 'reject'] : [],
    };
    return vaultAnswerDtoSchema.parse(vaultAnswerStateMachine.pickVisible(raw, answer.status as VaultAnswerDto['status'], 'assignee'));
  }

  async getParticipant(session: { userId: string } | null, id: string): Promise<VaultAnswerDto> {
    if (!session?.userId) throw new UnauthorizedError();
    const answer = await this.find(id);
    if (answer.seekerId === session.userId) return this.get(session, id);
    return this.getForMentor(session, id);
  }

  async reconcilePayment(session: { userId: string } | null, id: string, background?: (task: () => Promise<void>) => void): Promise<VaultAnswerDto> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.dependencies.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
    const answer = await this.find(id);
    assertOwns(session, answer.seekerId);
    const payment = await this.dependencies.paymentRepository.findByVaultAnswerId(id);
    if (!payment?.providerSessionId) throw new ConflictError('This answer has no checkout to reconcile.');
    const event = await this.dependencies.paymentGateway.getCheckout(payment.providerSessionId);
    if (event && event.subjectType === 'vault_answer' && event.subjectId === id) {
      await this.dependencies.paymentService.handleEvent(event);
    }
    if (background) background(() => this.runGeneration());
    else await this.runGeneration();
    return this.toSeekerDto(await this.find(id));
  }

  async completeMockCheckout(session: { userId: string } | null, id: string, outcome: 'complete' | 'fail'): Promise<VaultAnswerDto> {
    this.requireEnabled();
    if (!session?.userId) throw new UnauthorizedError();
    const answer = await this.find(id);
    assertOwns(session, answer.seekerId);
    if (answer.status !== 'pending_payment') return this.toSeekerDto(answer);
    const payment = await this.dependencies.paymentRepository.findByVaultAnswerId(id);
    if (!payment?.providerSessionId) throw new NotFoundError('Vault payment not found.');
    if (!(this.dependencies.paymentGateway instanceof MockPaymentGateway)) throw new NotFoundError();
    const event = outcome === 'complete'
      ? this.dependencies.paymentGateway.completeCheckout(payment.providerSessionId)
      : this.dependencies.paymentGateway.failCheckout(payment.providerSessionId);
    await this.dependencies.paymentService.handleEvent(event);
    if (outcome === 'complete') await this.runGeneration();
    return this.toSeekerDto(await this.find(id));
  }

  private async find(id: string): Promise<VaultAnswer> {
    const answer = await this.dependencies.vaultAnswerRepository.findById(id);
    if (!answer) throw new NotFoundError('Vault answer not found.');
    return answer;
  }

  private async toSeekerDto(answer: VaultAnswer): Promise<VaultAnswerDto> {
    const status = answer.status as VaultAnswerDto['status'];
    const raw = {
      id: answer.id,
      status,
      question: answer.question,
      priceMinor: answer.priceMinor,
      currency: answer.currency,
      ...(answer.answerText ? { answerText: answer.answerText } : {}),
      ...(answer.failureReason ? { failureReason: answer.failureReason } : {}),
      createdAt: answer.createdAt.toISOString(),
      updatedAt: answer.updatedAt.toISOString(),
      allowedActions: [],
    };
    const payment = await this.dependencies.paymentRepository.findByVaultAnswerId(answer.id);
    const refundStatus = payment?.status === 'refund_pending' ? 'processing' : payment?.status === 'refunded' ? 'refunded' : ['rejected', 'expired', 'cancelled', 'generation_failed'].includes(status) ? 'pending_approval' : 'none';
    Object.assign(raw, { refundStatus });
    const visible = vaultAnswerStateMachine.pickVisible(raw, status, 'seeker');
    if (status === 'released') {
      const citations = await this.dependencies.vaultAnswerRepository.findCitations(answer.id);
      Object.assign(visible, { citations: citations.map(({ noteId, mentorName, noteTitle }) => ({ noteId, mentorName, noteTitle })) });
    }
    return vaultAnswerDtoSchema.parse(visible);
  }

  private async runGeneration(): Promise<void> {
    await this.dependencies.vaultGenerationTask?.run({ limit: 5 });
  }

  private requireEnabled(): void {
    if (!this.dependencies.vaultSettings().enabled) throw new NotFoundError();
  }
}
