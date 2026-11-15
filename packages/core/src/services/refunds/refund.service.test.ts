/** @jest-environment node */
import type { ApprovalRequestRepository, OperatorRefundQueueRow, PaymentRepository } from '@devmentor/db';
import { StatusTransitionConflictError } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { AppError, ForbiddenError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import { RefundService } from './refund.service';

const APPROVAL_ID = '00000000-0000-4000-8000-000000000101';
const PAYMENT_ID = '00000000-0000-4000-8000-000000000102';
const BOOKING_ID = '00000000-0000-4000-8000-000000000103';
const OPERATOR_ID = '00000000-0000-4000-8000-000000000104';
const OTHER_ID = '00000000-0000-4000-8000-000000000105';

function setup(options: {
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  paymentStatus?: 'succeeded' | 'refund_pending' | 'refunded' | 'failed';
  reason?: string;
  reasons?: Array<'mentor_declined' | 'mentor_unresponsive'>;
  gateway?: PaymentGateway;
} = {}) {
  const approval = {
    id: APPROVAL_ID,
    kind: 'refund',
    subjectType: 'payment',
    subjectId: PAYMENT_ID,
    reason: options.reason ?? 'operator_initiated',
    status: options.approvalStatus ?? 'pending',
  };
  const payment = {
    id: PAYMENT_ID,
    bookingId: BOOKING_ID,
    status: options.paymentStatus ?? 'succeeded',
    providerPaymentId: 'provider-payment-1',
    amountMinor: 2500,
    currency: 'PLN',
  };
  const findById = jest.fn(async () => approval as never);
  const decide = jest.fn(async (_actor: { userId: string }, _id: string, status: 'approve' | 'reject') => {
    approval.status = status === 'approve' ? 'approved' : 'rejected';
    return { id: APPROVAL_ID, status: approval.status as 'approved' | 'rejected' };
  });
  const decideAsSystem = jest.fn(async () => {
    approval.status = 'approved';
    return { id: APPROVAL_ID, status: 'approved' as const };
  });
  const approvalQueueRow: OperatorRefundQueueRow = {
    approvalId: APPROVAL_ID,
    paymentId: PAYMENT_ID,
    bookingId: BOOKING_ID,
    reason: approval.reason,
    status: approval.status,
    createdAt: new Date('2026-11-05T12:00:00.000Z'),
    paymentStatus: payment.status,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    seekerName: 'Sam Seeker',
    mentorName: 'Ada Mentor',
  };
  const findOperatorRefundQueue = jest.fn(async () => [approvalQueueRow]);
  const findByPaymentId = jest.fn(async () => payment as never);
  const transitionRefundStatus = jest.fn(async (
    _id: string,
    from: readonly string[],
    to: string,
  ) => {
    if (!from.includes(payment.status)) throw new StatusTransitionConflictError();
    payment.status = to as typeof payment.status;
    return true;
  });
  const effects = new Map<string, { providerPaymentId: string; amountMinor: number }>();
  const refund = options.gateway?.refund ?? jest.fn(async (input: {
    providerPaymentId: string;
    amountMinor: number;
    idempotencyKey: string;
  }) => {
    const previous = effects.get(input.idempotencyKey);
    if (previous && (
      previous.providerPaymentId !== input.providerPaymentId ||
      previous.amountMinor !== input.amountMinor
    )) throw new Error('Idempotency key reused with different details.');
    effects.set(input.idempotencyKey, {
      providerPaymentId: input.providerPaymentId,
      amountMinor: input.amountMinor,
    });
  });
  const gateway: PaymentGateway = options.gateway ?? {
    provider: 'mock',
    createCheckout: jest.fn(),
    refund,
    verifyWebhook: jest.fn(),
    parseWebhook: jest.fn(),
    getCheckout: jest.fn(),
  };
  const logger: Logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const eventLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const eventBus = createEventBus(eventLogger);
  const refundedEvent = jest.fn();
  eventBus.on('payments.payment.refunded', refundedEvent);
  const service = new RefundService({
    approvalRequestRepository: {
      findById,
      findOperatorRefundQueue,
    } as unknown as ApprovalRequestRepository,
    paymentRepository: {
      findById: findByPaymentId,
      transitionRefundStatus,
    } as unknown as PaymentRepository,
    approvalService: { decide, decideAsSystem } as never,
    paymentGateway: gateway,
    eventBus,
    logger,
    bookingSettings: () => ({
      MENTOR_RESPONSE_WINDOW_MINUTES: 120,
      REFUND_AUTO_APPROVE_REASONS: options.reasons ?? [],
    }),
  });
  return {
    service,
    approval,
    payment,
    decide,
    decideAsSystem,
    findById,
    findOperatorRefundQueue,
    transitionRefundStatus,
    refund,
    effects,
    logger,
    refundedEvent,
    approvalQueueRow,
  };
}

describe('RefundService manual approvals', () => {
  const previousOperatorIds = process.env.OPERATOR_USER_IDS;

  beforeEach(() => {
    process.env.OPERATOR_USER_IDS = OPERATOR_ID;
  });

  afterAll(() => {
    if (previousOperatorIds === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = previousOperatorIds;
  });

  it('approves and executes with the approval id as the gateway idempotency key', async () => {
    const deps = setup();
    const result = await deps.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID);

    expect(result).toEqual({ id: APPROVAL_ID, status: 'refunded' });
    expect(deps.decide).toHaveBeenCalledWith({ userId: OPERATOR_ID }, APPROVAL_ID, 'approve');
    expect(deps.refund).toHaveBeenCalledWith({
      providerPaymentId: 'provider-payment-1',
      amountMinor: 2500,
      idempotencyKey: APPROVAL_ID,
    });
    expect(deps.payment.status).toBe('refunded');
    expect(deps.refundedEvent).toHaveBeenCalledWith({ paymentId: PAYMENT_ID });
  });

  it('leaves approved/refund_pending after gateway failure and retries exactly once', async () => {
    let successfulEffects = 0;
    const refund = jest.fn()
      .mockRejectedValueOnce(new Error('temporary provider failure'))
      .mockImplementation(async () => {
        successfulEffects += 1;
      });
    const deps = setup({ gateway: {
      provider: 'mock',
      createCheckout: jest.fn(),
      refund,
      verifyWebhook: jest.fn(),
      parseWebhook: jest.fn(),
      getCheckout: jest.fn(),
    } });

    await expect(deps.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID))
      .rejects.toMatchObject({ status: 503, code: 'refund_failed' });
    expect(deps.approval.status).toBe('approved');
    expect(deps.payment.status).toBe('refund_pending');

    await expect(deps.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID))
      .resolves.toEqual({ id: APPROVAL_ID, status: 'refunded' });
    expect(refund).toHaveBeenCalledTimes(2);
    expect(refund.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([APPROVAL_ID, APPROVAL_ID]);
    expect(successfulEffects).toBe(1);
    expect(deps.payment.status).toBe('refunded');
  });

  it('handles concurrent retries through provider idempotency and atomic status transitions', async () => {
    let finishCalls: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      finishCalls = resolve;
    });
    let refundInvocations = 0;
    let successfulEffects = 0;
    const gateway: PaymentGateway = {
      provider: 'mock',
      createCheckout: jest.fn(),
      refund: jest.fn(async (input) => {
        refundInvocations += 1;
        if (input.idempotencyKey !== APPROVAL_ID) throw new Error('wrong idempotency key');
        if (refundInvocations === 2) finishCalls();
        await barrier;
        if (successfulEffects === 0) successfulEffects = 1;
      }),
      verifyWebhook: jest.fn(),
      parseWebhook: jest.fn(),
      getCheckout: jest.fn(),
    };
    const concurrent = setup({ approvalStatus: 'approved', paymentStatus: 'refund_pending', gateway });
    const results = await Promise.all([
      concurrent.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID),
      concurrent.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID),
    ]);

    expect(results).toEqual([
      { id: APPROVAL_ID, status: 'refunded' },
      { id: APPROVAL_ID, status: 'refunded' },
    ]);
    expect(refundInvocations).toBe(2);
    expect(successfulEffects).toBe(1);
    expect(concurrent.payment.status).toBe('refunded');
    expect(concurrent.refundedEvent).toHaveBeenCalledTimes(1);
  });

  it('rejects pending requests without calling the gateway and rejects non-operators', async () => {
    const deps = setup();
    await expect(deps.service.approve({ userId: OTHER_ID }, APPROVAL_ID)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deps.service.reject({ userId: OPERATOR_ID }, APPROVAL_ID))
      .resolves.toEqual({ id: APPROVAL_ID, status: 'rejected' });
    expect(deps.decide).toHaveBeenCalledWith({ userId: OPERATOR_ID }, APPROVAL_ID, 'reject');
    expect(deps.refund).not.toHaveBeenCalled();
  });

  it('allows an approved refund retry and never calls the gateway again after completion', async () => {
    const deps = setup({ approvalStatus: 'approved', paymentStatus: 'refunded' });
    await expect(deps.service.approve({ userId: OPERATOR_ID }, APPROVAL_ID))
      .resolves.toEqual({ id: APPROVAL_ID, status: 'refunded' });
    expect(deps.refund).not.toHaveBeenCalled();
  });
});

describe('RefundService automatic approvals and operator queue', () => {
  const previousOperatorIds = process.env.OPERATOR_USER_IDS;

  beforeEach(() => {
    process.env.OPERATOR_USER_IDS = OPERATOR_ID;
  });

  afterAll(() => {
    if (previousOperatorIds === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = previousOperatorIds;
  });

  it('defaults to no automatic reasons and supports only explicitly enabled system approvals', async () => {
    const defaultSettings = setup({ reason: 'mentor_declined' });
    await expect(defaultSettings.service.approveAutomatically(APPROVAL_ID)).rejects.toBeInstanceOf(ForbiddenError);
    expect(defaultSettings.decideAsSystem).not.toHaveBeenCalled();
    expect(defaultSettings.refund).not.toHaveBeenCalled();

    const configured = setup({
      reason: 'mentor_declined',
      reasons: ['mentor_declined'],
    });
    await expect(configured.service.approveAutomatically(APPROVAL_ID))
      .resolves.toEqual({ id: APPROVAL_ID, status: 'refunded' });
    expect(configured.decideAsSystem).toHaveBeenCalledWith(APPROVAL_ID);
    expect(configured.refund).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: APPROVAL_ID }));
  });

  it('keeps auto-approved failures retryable and reports a safe failure message', async () => {
    const deps = setup({
      reason: 'mentor_unresponsive',
      reasons: ['mentor_unresponsive'],
      gateway: {
        provider: 'mock',
        createCheckout: jest.fn(),
        refund: jest.fn(async () => { throw new Error('provider contains sensitive response'); }),
        verifyWebhook: jest.fn(),
        parseWebhook: jest.fn(),
        getCheckout: jest.fn(),
      },
    });
    await expect(deps.service.approveAutomatically(APPROVAL_ID)).rejects.toBeInstanceOf(AppError);
    expect(deps.approval.status).toBe('approved');
    expect(deps.payment.status).toBe('refund_pending');
    expect(deps.logger.warn).toHaveBeenCalledWith(
      'Refund gateway call failed; the approved refund remains retryable.',
      { approvalId: APPROVAL_ID, paymentId: PAYMENT_ID },
    );
    expect((deps.logger.warn as jest.Mock).mock.calls[0][1]).not.toHaveProperty('question');
  });

  it('lists only summary fields and exposes approved refund_pending items for retry', async () => {
    const deps = setup({ approvalStatus: 'approved', paymentStatus: 'refund_pending' });
    const queue = await deps.service.listOperatorApprovals({ userId: OPERATOR_ID });

    expect(queue.items[0]).toMatchObject({
      approvalId: APPROVAL_ID,
      bookingId: BOOKING_ID,
      status: 'approved',
      paymentStatus: 'refund_pending',
      allowedActions: ['retry_refund'],
    });
    expect(queue.items[0]).not.toHaveProperty('question');
    expect(deps.findOperatorRefundQueue).toHaveBeenCalled();
  });
});
