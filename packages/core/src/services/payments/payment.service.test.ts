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
      } satisfies NormalizedPaymentEvent,
    ],
    [
      'checkout.failed',
      {
        type: 'checkout.failed',
        bookingId: 'booking-1',
        providerSessionId: 'session-1',
        providerPaymentId: 'failed-payment-1',
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
