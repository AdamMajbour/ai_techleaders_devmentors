import type { ApprovalRequestRepository, OperatorRefundQueueRow, PaymentRepository } from '@devmentor/db';
import { StatusTransitionConflictError } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { requireOperator } from '../../http/auth';
import type { Session } from '../../security/session';
import { getBookingSettings, type BookingSettings } from '../../config/env';
import type { ApprovalService } from '../approvals/approval.service';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import type { RefundApprovalDto } from '../dto';

type RefundExecutionActor =
  | { kind: 'system' }
  | { kind: 'user'; userId: string };

type Dependencies = {
  approvalRequestRepository: Pick<ApprovalRequestRepository, 'findById' | 'findOperatorRefundQueue'>;
  paymentRepository: Pick<PaymentRepository, 'findById' | 'transitionRefundStatus'>;
  approvalService: Pick<ApprovalService, 'decide' | 'decideAsSystem'>;
  paymentGateway: PaymentGateway;
  eventBus: EventBus;
  logger: Logger;
  bookingSettings?: () => BookingSettings;
};

export class RefundService {
  private readonly approvalRequestRepository: Dependencies['approvalRequestRepository'];
  private readonly paymentRepository: Dependencies['paymentRepository'];
  private readonly approvalService: Dependencies['approvalService'];
  private readonly paymentGateway: PaymentGateway;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly bookingSettings: NonNullable<Dependencies['bookingSettings']>;

  constructor({
    approvalRequestRepository,
    paymentRepository,
    approvalService,
    paymentGateway,
    eventBus,
    logger,
    bookingSettings = getBookingSettings,
  }: Dependencies) {
    this.approvalRequestRepository = approvalRequestRepository;
    this.paymentRepository = paymentRepository;
    this.approvalService = approvalService;
    this.paymentGateway = paymentGateway;
    this.eventBus = eventBus;
    this.logger = logger;
    this.bookingSettings = bookingSettings;
  }

  async listOperatorApprovals(actor: Session): Promise<{ items: RefundApprovalDto[] }> {
    requireOperator(actor);
    const rows = await this.approvalRequestRepository.findOperatorRefundQueue();
    return { items: rows.map((row) => this.toDto(row)) };
  }

  async approve(actor: Session, approvalId: string): Promise<{ id: string; status: 'refunded' }> {
    requireOperator(actor);
    const approval = await this.requireRefundApproval(approvalId);

    if (approval.status === 'pending') {
      try {
        await this.approvalService.decide(actor, approvalId, 'approve');
      } catch (error) {
        const replay = await this.requireRefundApproval(approvalId);
        if (replay.status !== 'approved') throw error;
      }
    } else if (approval.status !== 'approved') {
      throw new ConflictError('Only a pending or approved refund can be processed.');
    }

    return this.execute(approvalId, { kind: 'user', userId: actor.userId });
  }

  async reject(actor: Session, approvalId: string): Promise<{ id: string; status: 'rejected' }> {
    requireOperator(actor);
    const approval = await this.requireRefundApproval(approvalId);
    if (approval.status !== 'pending') throw new ConflictError();
    const result = await this.approvalService.decide(actor, approvalId, 'reject');
    if (result.status !== 'rejected') throw new ConflictError();
    return { id: result.id, status: 'rejected' };
  }

  async approveAutomatically(approvalId: string): Promise<{ id: string; status: 'refunded' }> {
    const approval = await this.requireRefundApproval(approvalId);
    const enabledReasons = this.bookingSettings().REFUND_AUTO_APPROVE_REASONS;
    if (!enabledReasons.includes(approval.reason as (typeof enabledReasons)[number])) {
      throw new ForbiddenError('Automatic approval is not enabled for this refund reason.');
    }
    if (approval.status === 'pending') {
      try {
        await this.approvalService.decideAsSystem(approvalId);
      } catch (error) {
        const replay = await this.requireRefundApproval(approvalId);
        if (replay.status !== 'approved') throw error;
      }
    } else if (approval.status !== 'approved') {
      throw new ConflictError('Only a pending or approved refund can be processed.');
    }

    return this.execute(approvalId, { kind: 'system' });
  }

  private async execute(
    approvalId: string,
    actor: RefundExecutionActor,
  ): Promise<{ id: string; status: 'refunded' }> {
    const approval = await this.requireRefundApproval(approvalId);
    if (approval.status !== 'approved') throw new ConflictError('The refund must be approved before processing.');

    let payment = await this.paymentRepository.findById(approval.subjectId);
    if (!payment) throw new NotFoundError('Refund payment not found.');
    if (payment.status === 'refunded') return { id: approvalId, status: 'refunded' };

    if (payment.status === 'succeeded') {
      try {
        await this.paymentRepository.transitionRefundStatus(
          payment.id,
          ['succeeded'],
          'refund_pending',
          actor,
        );
      } catch (error) {
        if (!(error instanceof StatusTransitionConflictError)) throw error;
      }
      payment = await this.paymentRepository.findById(payment.id);
      if (!payment) throw new NotFoundError('Refund payment not found.');
    }

    if (payment.status !== 'refund_pending' || !payment.providerPaymentId) {
      throw new ConflictError('This payment is not available for refund processing.');
    }

    try {
      await this.paymentGateway.refund({
        providerPaymentId: payment.providerPaymentId,
        amountMinor: payment.amountMinor,
        idempotencyKey: approval.id,
      });
    } catch {
      this.logger.warn('Refund gateway call failed; the approved refund remains retryable.', {
        approvalId,
        paymentId: payment.id,
      });
      throw new AppError(
        'The refund could not be completed. The approved request remains available for retry.',
        'refund_failed',
        503,
      );
    }

    try {
      const transitioned = await this.paymentRepository.transitionRefundStatus(
        payment.id,
        ['refund_pending'],
        'refunded',
        actor,
      );
      if (transitioned) {
        await this.eventBus.emit('payments.payment.refunded', { paymentId: payment.id });
      }
    } catch (error) {
      if (!(error instanceof StatusTransitionConflictError)) throw error;
    }

    const finalPayment = await this.paymentRepository.findById(payment.id);
    if (finalPayment?.status !== 'refunded') {
      throw new ConflictError('The refund provider succeeded but the payment status needs reconciliation.');
    }
    return { id: approvalId, status: 'refunded' };
  }

  private async requireRefundApproval(id: string) {
    const approval = await this.approvalRequestRepository.findById(id);
    if (!approval) throw new NotFoundError('Approval request not found.');
    if (approval.kind !== 'refund' || approval.subjectType !== 'payment') {
      throw new NotFoundError('Refund approval not found.');
    }
    return approval;
  }

  private toDto(row: OperatorRefundQueueRow): RefundApprovalDto {
    return {
      approvalId: row.approvalId,
      paymentId: row.paymentId,
      bookingId: row.bookingId,
      reason: row.reason,
      status: row.status as RefundApprovalDto['status'],
      createdAt: new Date(row.createdAt).toISOString(),
      paymentStatus: row.paymentStatus as RefundApprovalDto['paymentStatus'],
      amountMinor: row.amountMinor,
      currency: row.currency,
      seekerName: row.seekerName,
      mentorName: row.mentorName,
      allowedActions: row.status === 'pending' ? ['approve', 'reject'] : ['retry_refund'],
    };
  }
}
