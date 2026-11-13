/** @jest-environment node */
import type { PaymentWebhookSettlementResult } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import type { NormalizedPaymentEvent } from './payment-gateway.port';
import { PaymentService } from './payment.service';

const completed: NormalizedPaymentEvent = {
  type: 'checkout.completed',
  bookingId: 'booking-1',
  providerSessionId: 'session-1',
  providerPaymentId: 'provider-payment-1',
  amountMinor: 2500,
  currency: 'EUR',
  livemode: true,
};

function setup(result: PaymentWebhookSettlementResult) {
  const settleWebhookEvent = jest.fn(async () => result);
  const emit = jest.fn(async () => undefined);
  const warn = jest.fn();
  const logger: Logger = { info: jest.fn(), warn, error: jest.fn() };
  const service = new PaymentService({
    paymentRepository: { settleWebhookEvent } as never,
    eventBus: { emit } as unknown as EventBus,
    logger,
  });
  return { service, settleWebhookEvent, emit, logger, warn };
}

describe('PaymentService.handleEvent', () => {
  it('settles a completed checkout and emits only ID-only success events', async () => {
    const { service, settleWebhookEvent, emit } = setup({
      status: 'transitioned',
      paymentId: 'payment-1',
      bookingId: 'booking-1',
    });

    await service.handleEvent(completed);

    expect(settleWebhookEvent).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      providerSessionId: 'session-1',
      status: 'succeeded',
      amountMinor: 2500,
      currency: 'EUR',
      providerPaymentId: 'provider-payment-1',
      livemode: true,
    });
    expect(emit.mock.calls).toEqual([
      ['payments.payment.succeeded', { paymentId: 'payment-1' }],
      ['bookings.booking.paid', { bookingId: 'booking-1' }],
    ]);
  });

  it.each([
    ['amount', ['amountMinor']],
    ['currency', ['currency']],
    ['provider session or booking', ['bookingId', 'providerSessionId']],
  ])('logs a %s mismatch without emitting events or logging payload values', async (_label, fields) => {
    const { service, emit, warn } = setup({
      status: 'mismatch',
      paymentId: 'payment-1',
      fields: fields as string[],
    });

    await service.handleEvent(completed);

    expect(warn).toHaveBeenCalledWith(
      'Payment webhook did not match the persisted checkout.',
      {
        eventType: 'checkout.completed',
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        mismatchFields: fields,
      },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('session-1');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('2500');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('provider-payment-1');
    expect(emit).not.toHaveBeenCalled();
  });

  it('treats terminal replays and out-of-order events as no-ops', async () => {
    const { service, emit } = setup({ status: 'noop' });

    await service.handleEvent(completed);
    await service.handleEvent({
      type: 'checkout.failed',
      bookingId: 'booking-1',
      providerSessionId: 'session-1',
      amountMinor: 2500,
      currency: 'EUR',
      livemode: false,
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it.each([
    [
      'checkout.expired',
      {
        type: 'checkout.expired',
        bookingId: 'booking-1',
        providerSessionId: 'session-1',
        amountMinor: 2500,
        currency: 'EUR',
        livemode: false,
      } satisfies NormalizedPaymentEvent,
    ],
    [
      'checkout.failed',
      {
        type: 'checkout.failed',
        bookingId: 'booking-1',
        providerSessionId: 'session-1',
        providerPaymentId: 'failed-payment-1',
        amountMinor: 2500,
        currency: 'EUR',
        livemode: false,
      } satisfies NormalizedPaymentEvent,
    ],
  ])('marks %s as failed without marking the booking paid', async (_type, event) => {
    const { service, settleWebhookEvent, emit } = setup({
      status: 'transitioned',
      paymentId: 'payment-1',
      bookingId: 'booking-1',
    });

    await service.handleEvent(event);

    expect(settleWebhookEvent).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      providerSessionId: 'session-1',
      status: 'failed',
      ...('providerPaymentId' in event ? { providerPaymentId: event.providerPaymentId } : {}),
    });
    expect(emit.mock.calls).toEqual([['payments.payment.failed', { paymentId: 'payment-1' }]]);
  });
});

describe('PaymentService payable-subject dispatch', () => {
  it('settles vault payments and runs the registered subject handler in the unit of work', async () => {
    const settlement = { status: 'transitioned' as const, paymentId: 'payment-vault-1', paymentStatus: 'succeeded' };
    const settleSubjectWebhookEvent = jest.fn().mockResolvedValue(settlement);
    const onPaid = jest.fn();
    const onFailed = jest.fn();
    const work = jest.fn();
    const unitOfWork = { run: async <T>(callback: () => Promise<T>): Promise<T> => { work(); return callback(); } };
    const handler = {
      type: 'vault_answer' as const,
      expectedAmount: jest.fn().mockResolvedValue({ amountMinor: 1000, currency: 'EUR' }),
      onPaid,
      onFailed,
    };
    const service = new PaymentService({
      paymentRepository: { settleWebhookEvent: jest.fn(), settleSubjectWebhookEvent } as never,
      eventBus: { emit: jest.fn() } as unknown as EventBus,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      paymentSubjectHandlers: [handler],
      unitOfWork,
    });
    await service.handleEvent({
      type: 'checkout.completed',
      subjectType: 'vault_answer',
      subjectId: 'answer-1',
      providerSessionId: 'session-1',
      providerPaymentId: 'provider-1',
      amountMinor: 1000,
      currency: 'EUR',
      livemode: false,
    });

    expect(settleSubjectWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({
      subjectType: 'vault_answer',
      subjectId: 'answer-1',
      expectedAmountMinor: 1000,
      expectedCurrency: 'EUR',
    }));
    expect(work).toHaveBeenCalledTimes(1);
    expect(onPaid).toHaveBeenCalledWith('answer-1', 'payment-vault-1');
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('does not call the subject handler for an amount mismatch', async () => {
    const onPaid = jest.fn();
    const service = new PaymentService({
      paymentRepository: {
        settleWebhookEvent: jest.fn(),
        settleSubjectWebhookEvent: jest.fn().mockResolvedValue({ status: 'mismatch', paymentId: 'payment-1', fields: ['amountMinor'] }),
      } as never,
      eventBus: { emit: jest.fn() } as unknown as EventBus,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      paymentSubjectHandlers: [{
        type: 'vault_answer', expectedAmount: jest.fn().mockResolvedValue({ amountMinor: 1000, currency: 'EUR' }),
        onPaid, onFailed: jest.fn(),
      }],
    });
    await service.handleEvent({
      type: 'checkout.completed', subjectType: 'vault_answer', subjectId: 'answer-1',
      providerSessionId: 'session-1', providerPaymentId: 'provider-1', amountMinor: 1001, currency: 'EUR',
    });
    expect(onPaid).not.toHaveBeenCalled();
  });
});
