import type { ApprovalRequestRepository } from '@devmentor/db';
import { PendingApprovalConflictError, StatusTransitionConflictError } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { requireOperator } from '../../http/auth';
import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';

export interface ApprovalSubject {
  type: string;
  id: string;
}

export interface ApprovalRequestDetails {
  approvalId: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  status: string;
}

export type ApprovalDecision = 'approve' | 'reject';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type TerminalApprovalStatus = Exclude<ApprovalStatus, 'pending'>;
export type ApproverResolver = (
  actor: Session,
  approval: ApprovalRequestDetails,
) => void | boolean | Promise<void | boolean>;

export type ApproverResolvers = Readonly<Record<string, ApproverResolver | undefined>>;

export const defaultApproverResolvers: ApproverResolvers = {
  refund: (actor) => requireOperator(actor),
};

interface Dependencies {
  approvalRequestRepository: Pick<
    ApprovalRequestRepository,
    | 'create'
    | 'findById'
    | 'findPendingBySubject'
    | 'findBySubjectStatuses'
    | 'transitionStatus'
    | 'transitionSystemStatus'
  >;
  eventBus: EventBus;
  clock: Clock;
  approverResolvers?: ApproverResolvers;
}

export class ApprovalService {
  private readonly approvalRequestRepository: Dependencies['approvalRequestRepository'];
  private readonly eventBus: EventBus;
  private readonly clock: Clock;
  private readonly approverResolvers: ApproverResolvers;

  constructor({
    approvalRequestRepository,
    eventBus,
    clock,
    approverResolvers = defaultApproverResolvers,
  }: Dependencies) {
    this.approvalRequestRepository = approvalRequestRepository;
    this.eventBus = eventBus;
    this.clock = clock;
    this.approverResolvers = approverResolvers;
  }

  async request(kind: string, subject: ApprovalSubject, reason: string): Promise<{ id: string }> {
    if (kind === 'refund') {
      const existing = await this.approvalRequestRepository.findBySubjectStatuses(
        kind,
        subject.type,
        subject.id,
        ['pending', 'approved'],
      );
      if (existing) return { id: existing.id };
    }

    let approval: { id: string };
    try {
      approval = await this.approvalRequestRepository.create({
        kind,
        subjectType: subject.type,
        subjectId: subject.id,
        reason,
      });
    } catch (error) {
      if (error instanceof PendingApprovalConflictError && kind === 'refund') {
        const existing = await this.approvalRequestRepository.findPendingBySubject(kind, subject.type, subject.id);
        if (existing) return { id: existing.id };
      }
      if (error instanceof PendingApprovalConflictError) throw new ConflictError();
      throw error;
    }

    await this.eventBus.emit('approvals.approval.requested', { approvalId: approval.id });
    return { id: approval.id };
  }

  async decide(
    actor: Session,
    id: string,
    decision: ApprovalDecision,
  ): Promise<{ id: string; status: TerminalApprovalStatus }> {
    const approval = await this.approvalRequestRepository.findById(id);
    if (!approval) throw new NotFoundError('Approval request not found.');

    const resolver = Object.hasOwn(this.approverResolvers, approval.kind)
      ? this.approverResolvers[approval.kind]
      : undefined;
    if (!resolver) throw new ForbiddenError();
    const details: ApprovalRequestDetails = {
      approvalId: approval.id,
      kind: approval.kind,
      subjectType: approval.subjectType,
      subjectId: approval.subjectId,
      reason: approval.reason,
      status: approval.status,
    };
    if ((await resolver(actor, details)) === false) throw new ForbiddenError();

    const status: TerminalApprovalStatus = decision === 'approve' ? 'approved' : 'rejected';
    const decidedAt = this.clock.now();
    try {
      const transitioned = await this.approvalRequestRepository.transitionStatus(
        id,
        status,
        actor.userId,
        decidedAt,
      );
      if (!transitioned) throw new ConflictError();
    } catch (error) {
      if (error instanceof StatusTransitionConflictError) throw new ConflictError();
      throw error;
    }

    const event =
      status === 'approved' ? 'approvals.approval.approved' : 'approvals.approval.rejected';
    await this.eventBus.emit(event, { approvalId: id });
    return { id, status };
  }

  async decideAsSystem(id: string): Promise<{ id: string; status: 'approved' }> {
    const approval = await this.approvalRequestRepository.findById(id);
    if (!approval) throw new NotFoundError('Approval request not found.');
    if (approval.status !== 'pending') throw new ConflictError();

    const decidedAt = this.clock.now();
    try {
      if (!(await this.approvalRequestRepository.transitionSystemStatus(id, 'approved', decidedAt))) {
        throw new ConflictError();
      }
    } catch (error) {
      if (error instanceof StatusTransitionConflictError) throw new ConflictError();
      throw error;
    }

    await this.eventBus.emit('approvals.approval.approved', { approvalId: id });
    return { id, status: 'approved' };
  }
}
