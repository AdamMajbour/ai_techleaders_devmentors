/** @jest-environment node */
import type { ApprovalRequestRepository } from '@devmentor/db';
import { PendingApprovalConflictError, StatusTransitionConflictError } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { ConflictError, ForbiddenError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
import {
  ApprovalService,
  defaultApproverResolvers,
  type ApproverResolvers,
} from './approval.service';

const APPROVAL_ID = '00000000-0000-4000-8000-000000000101';
const SUBJECT_ID = '00000000-0000-4000-8000-000000000102';
const OPERATOR_ID = '00000000-0000-4000-8000-000000000103';
const OTHER_ID = '00000000-0000-4000-8000-000000000104';
const DECIDED_AT = new Date('2026-11-05T12:00:00.000Z');
const pendingApproval = () => ({
  id: APPROVAL_ID,
  kind: 'refund',
  subjectType: 'payment',
  subjectId: SUBJECT_ID,
  reason: 'Customer request',
  status: 'pending',
});

function setup(
  repositoryOverrides: Partial<Record<keyof ApprovalRequestRepository, jest.Mock>> = {},
  approverResolvers: ApproverResolvers = {},
) {
  const approval = pendingApproval();
  const eventLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const eventBus = createEventBus(eventLogger);
  const requested = jest.fn();
  const approved = jest.fn();
  const rejected = jest.fn();
  eventBus.on('approvals.approval.requested', requested);
  eventBus.on('approvals.approval.approved', approved);
  eventBus.on('approvals.approval.rejected', rejected);

  const repository = {
    create: jest.fn(async () => approval),
    findById: jest.fn(async () => approval),
    findBySubject: jest.fn(async () => null),
    transitionStatus: jest.fn(async () => true),
    ...repositoryOverrides,
  } as unknown as ApprovalRequestRepository;
  const clock: Clock = { now: jest.fn(() => DECIDED_AT) };
  const service = new ApprovalService({
    approvalRequestRepository: repository,
    eventBus,
    clock,
    approverResolvers,
  });
  return { service, repository, clock, requested, approved, rejected, approval };
}

describe('ApprovalService.request', () => {
  it('creates a pending approval and emits an id-only request event', async () => {
    const { service, repository, requested } = setup();

    await expect(service.request('refund', { type: 'payment', id: SUBJECT_ID }, 'Customer request')).resolves.toEqual({
      id: APPROVAL_ID,
    });

    expect(repository.create).toHaveBeenCalledWith({
      kind: 'refund',
      subjectType: 'payment',
      subjectId: SUBJECT_ID,
      reason: 'Customer request',
    });
    expect(requested).toHaveBeenCalledWith({ approvalId: APPROVAL_ID });
    expect(Object.keys(requested.mock.calls[0][0] as object)).toEqual(['approvalId']);
  });

  it('returns an existing refund request on duplicate calls and preserves unrelated failures', async () => {
    const duplicateCall = setup({
      findBySubject: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pendingApproval()),
      create: jest.fn(async () => Promise.reject(new PendingApprovalConflictError())),
    });
    await expect(duplicateCall.service.request('refund', { type: 'payment', id: SUBJECT_ID }, 'Reason'))
      .resolves.toEqual({ id: APPROVAL_ID });

    const duplicate = setup({ create: jest.fn(async () => Promise.reject(new PendingApprovalConflictError())) });
    await expect(duplicate.service.request('refund', { type: 'payment', id: SUBJECT_ID }, 'Reason'))
      .rejects.toBeInstanceOf(ConflictError);

    const existing = setup({ findBySubject: jest.fn(async () => pendingApproval()) });
    await expect(existing.service.request('refund', { type: 'payment', id: SUBJECT_ID }, 'Different reason'))
      .resolves.toEqual({ id: APPROVAL_ID });
    expect(existing.repository.create).not.toHaveBeenCalled();

    const databaseFailure = setup({ create: jest.fn(async () => Promise.reject(new Error('database unavailable'))) });
    await expect(databaseFailure.service.request('refund', { type: 'payment', id: SUBJECT_ID }, 'Reason'))
      .rejects.toThrow('database unavailable');
  });
});

describe('ApprovalService.decide', () => {
  it('allows only configured operators to decide refunds', async () => {
    const previous = process.env.OPERATOR_USER_IDS;
    process.env.OPERATOR_USER_IDS = OPERATOR_ID;
    const { service, repository, approved } = setup({}, defaultApproverResolvers);
    try {
      await expect(service.decide({ userId: OTHER_ID }, APPROVAL_ID, 'approve')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repository.transitionStatus).not.toHaveBeenCalled();

      await expect(service.decide({ userId: OPERATOR_ID }, APPROVAL_ID, 'approve')).resolves.toEqual({
        id: APPROVAL_ID,
        status: 'approved',
      });
      expect(repository.transitionStatus).toHaveBeenCalledWith(APPROVAL_ID, 'approved', OPERATOR_ID, DECIDED_AT);
      expect(approved).toHaveBeenCalledWith({ approvalId: APPROVAL_ID });
    } finally {
      if (previous === undefined) delete process.env.OPERATOR_USER_IDS;
      else process.env.OPERATOR_USER_IDS = previous;
    }
  });

  it.each([
    ['approve', 'approved', 'approvals.approval.approved'],
    ['reject', 'rejected', 'approvals.approval.rejected'],
  ] as const)('supports %s decisions with clock patch and id-only events', async (decision, status, event) => {
    const resolver = jest.fn(() => true);
    const { service, repository, clock, approved, rejected } = setup({}, { refund: resolver });

    await expect(service.decide({ userId: OTHER_ID }, APPROVAL_ID, decision)).resolves.toEqual({
      id: APPROVAL_ID,
      status,
    });

    expect(resolver).toHaveBeenCalledWith(
      { userId: OTHER_ID },
      expect.objectContaining({ approvalId: APPROVAL_ID, subjectId: SUBJECT_ID }),
    );
    expect(clock.now).toHaveBeenCalledTimes(1);
    expect(repository.transitionStatus).toHaveBeenCalledWith(APPROVAL_ID, status, OTHER_ID, DECIDED_AT);
    const emitted = event === 'approvals.approval.approved' ? approved : rejected;
    expect(emitted).toHaveBeenCalledWith({ approvalId: APPROVAL_ID });
    expect(Object.keys(emitted.mock.calls[0][0] as object)).toEqual(['approvalId']);
  });

  it('denies a missing resolver or a resolver that declines access', async () => {
    const noResolver = setup();
    await expect(noResolver.service.decide({ userId: OTHER_ID }, APPROVAL_ID, 'approve'))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(noResolver.repository.transitionStatus).not.toHaveBeenCalled();

    const denied = setup({}, { refund: () => false });
    await expect(denied.service.decide({ userId: OTHER_ID }, APPROVAL_ID, 'approve'))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(denied.repository.transitionStatus).not.toHaveBeenCalled();
  });

  it('converts only a transition conflict and emits no event when a concurrent decision loses', async () => {
    let status = 'pending';
    const transitionStatus = jest.fn(async () => {
      if (status !== 'pending') throw new StatusTransitionConflictError();
      status = 'approved';
      return true;
    });
    const { service, approved, rejected } = setup({ transitionStatus }, { refund: () => undefined });

    const outcomes = await Promise.allSettled([
      service.decide({ userId: OTHER_ID }, APPROVAL_ID, 'approve'),
      service.decide({ userId: OPERATOR_ID }, APPROVAL_ID, 'reject'),
    ]);

    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failure = outcomes.find((result) => result.status === 'rejected');
    expect(failure).toMatchObject({ status: 'rejected', reason: expect.any(ConflictError) });
    expect(transitionStatus).toHaveBeenCalledTimes(2);
    expect(approved.mock.calls.length + rejected.mock.calls.length).toBe(1);
  });

  it('preserves non-transition failures', async () => {
    const { service } = setup(
      { transitionStatus: jest.fn(async () => Promise.reject(new Error('database unavailable'))) },
      { refund: () => undefined },
    );
    await expect(service.decide({ userId: OTHER_ID }, APPROVAL_ID, 'approve')).rejects.toThrow('database unavailable');
  });
});
