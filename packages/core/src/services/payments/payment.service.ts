import type { PaymentRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import type { UnitOfWork } from '../../workflow/unit-of-work.port';
import { bookingStateMachine } from '../../workflow/booking-state-machine';
import { paymentStateMachine } from '../../workflow/payment-state-machine';
import type { NormalizedPaymentEvent } from './payment-gateway.port';

type Dependencies = {
  paymentRepository: Pick<PaymentRepository, 'settleWebhookEvent'> & Partial<Pick<PaymentRepository, 'settleSubjectWebhookEvent'>>;
  eventBus: EventBus;
  logger: Logger;
  paymentSubjectHandlers?: readonly PaymentSubjectHandler[];
  unitOfWork?: UnitOfWork;
};

export interface PaymentSubjectHandler {
  readonly type: 'vault_answer';
  expectedAmount(subjectId: string): Promise<{ amountMinor: number; currency: string } | null>;
  onPaid(subjectId: string, paymentId: string): Promise<void>;
  onFailed(subjectId: string, paymentId: string): Promise<void>;
}

export class PaymentService {
  private readonly paymentRepository: Dependencies['paymentRepository'];
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly subjectHandlers: ReadonlyMap<PaymentSubjectHandler['type'], PaymentSubjectHandler>;
  private readonly unitOfWork: UnitOfWork;

  constructor({ paymentRepository, eventBus, logger, paymentSubjectHandlers = [], unitOfWork }: Dependencies) {
    this.paymentRepository = paymentRepository;
    this.eventBus = eventBus;
    this.logger = logger;
    this.subjectHandlers = new Map(paymentSubjectHandlers.map((handler) => [handler.type, handler]));
    this.unitOfWork = unitOfWork ?? { run: (work) => work() };
  }

  async handleEvent(event: NormalizedPaymentEvent): Promise<void> {
    const subjectType = event.subjectType ?? 'booking';
    const subjectId = event.subjectId ?? event.bookingId;
    if (!subjectId) {
      this.logger.warn('Payment event has no subject identifier.', { eventType: event.type, subjectType });
      return;
    }
    if (subjectType === 'vault_answer') {
      await this.handleVaultAnswerEvent(event, subjectId);
      return;
    }
    await this.handleBookingEvent(event, subjectId);
  }

  private async handleVaultAnswerEvent(event: NormalizedPaymentEvent, subjectId: string): Promise<void> {
    const handler = this.subjectHandlers.get('vault_answer');
    if (!handler) {
      this.logger.error('Payment subject handler is not registered.', { subjectType: 'vault_answer' });
      return;
    }
    const succeeded = event.type === 'checkout.completed';
    if (!this.paymentRepository.settleSubjectWebhookEvent) {
      this.logger.error('Generic payment settlement is not configured.', { subjectType: 'vault_answer' });
      return;
    }
    const expected = succeeded ? await handler.expectedAmount(subjectId) : null;
    if (succeeded && !expected) {
      this.logger.warn('Vault payment subject was not found.', { subjectId });
      return;
    }
    const result = await this.unitOfWork.run(async () => {
      const settlement = await this.paymentRepository.settleSubjectWebhookEvent!({
        subjectType: 'vault_answer',
        subjectId,
        providerSessionId: event.providerSessionId,
        status: succeeded ? 'succeeded' : 'failed',
        amountMinor: event.amountMinor,
        currency: event.currency,
        expectedAmountMinor: expected?.amountMinor ?? 0,
        expectedCurrency: expected?.currency ?? event.currency,
        ...(succeeded ? { providerPaymentId: event.providerPaymentId, livemode: event.livemode ?? false } : {}),
        ...(!succeeded && event.providerPaymentId ? { providerPaymentId: event.providerPaymentId } : {}),
      });
      if (settlement.status === 'mismatch' || !settlement.paymentId) return settlement;
      if (succeeded && settlement.paymentStatus !== 'failed' && settlement.paymentStatus !== 'refunded') {
        await handler.onPaid(subjectId, settlement.paymentId);
      } else if (!succeeded && settlement.paymentStatus !== 'succeeded' && settlement.paymentStatus !== 'refunded') {
        await handler.onFailed(subjectId, settlement.paymentId);
      }
      return settlement;
    });
    if (result.status === 'mismatch') {
      this.logger.warn('Vault payment webhook did not match the persisted checkout.', {
        subjectId,
        paymentId: result.paymentId,
        mismatchFields: result.fields,
      });
    }
  }

  private async handleBookingEvent(event: NormalizedPaymentEvent, bookingId: string): Promise<void> {
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
            bookingId,
            providerSessionId: event.providerSessionId,
            status: 'succeeded',
            amountMinor: event.amountMinor,
            currency: event.currency,
            providerPaymentId: event.providerPaymentId,
            livemode: event.livemode ?? false,
          }
        : {
            bookingId,
            providerSessionId: event.providerSessionId,
            status: 'failed',
            ...(event.providerPaymentId === undefined ? {} : { providerPaymentId: event.providerPaymentId }),
          },
    );

    if (result.status === 'mismatch') {
      this.logger.warn('Payment webhook did not match the persisted checkout.', {
        eventType: event.type,
        bookingId,
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
