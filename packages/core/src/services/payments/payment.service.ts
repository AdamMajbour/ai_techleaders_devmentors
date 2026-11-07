import type { PaymentRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import { bookingStateMachine } from '../../workflow/booking-state-machine';
import { paymentStateMachine } from '../../workflow/payment-state-machine';
import type { NormalizedPaymentEvent } from './payment-gateway.port';

type Dependencies = {
  paymentRepository: Pick<PaymentRepository, 'settleWebhookEvent'>;
  eventBus: EventBus;
  logger: Logger;
};

export class PaymentService {
  private readonly paymentRepository: Dependencies['paymentRepository'];
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  constructor({ paymentRepository, eventBus, logger }: Dependencies) {
    this.paymentRepository = paymentRepository;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async handleEvent(event: NormalizedPaymentEvent): Promise<void> {
    const succeeded = event.type === 'checkout.completed';
    const paymentAction = succeeded ? 'markSucceeded' : 'markFailed';
    const bookingAction = succeeded ? 'markPaid' : 'markPaymentFailed';
    if (
      !paymentStateMachine.can('pending', paymentAction, 'webhook') ||
      !bookingStateMachine.can('pending_payment', bookingAction, 'webhook')
    ) {
      throw new Error('Payment webhook requested an illegal state transition.');
    }

    const result = await this.paymentRepository.settleWebhookEvent(
      succeeded
        ? {
            bookingId: event.bookingId,
            providerSessionId: event.providerSessionId,
            status: 'succeeded',
            amountMinor: event.amountMinor,
            currency: event.currency,
            providerPaymentId: event.providerPaymentId,
            livemode: event.livemode ?? false,
          }
        : {
            bookingId: event.bookingId,
            providerSessionId: event.providerSessionId,
            status: 'failed',
            ...(event.providerPaymentId === undefined ? {} : { providerPaymentId: event.providerPaymentId }),
          },
    );

    if (result.status === 'mismatch') {
      this.logger.warn('Payment webhook did not match the persisted checkout.', {
        eventType: event.type,
        bookingId: event.bookingId,
        paymentId: result.paymentId,
        mismatchFields: result.fields,
      });
      return;
    }
    if (result.status !== 'transitioned') return;

    if (succeeded) {
      await this.eventBus.emit('payments.payment.succeeded', { paymentId: result.paymentId });
      await this.eventBus.emit('bookings.booking.paid', { bookingId: result.bookingId });
      return;
    }

    await this.eventBus.emit('payments.payment.failed', { paymentId: result.paymentId });
  }
}
