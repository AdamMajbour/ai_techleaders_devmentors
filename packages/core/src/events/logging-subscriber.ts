import type { Logger } from '../logger';
import type { EventBus } from './event-bus';
import type { EventName } from './event-map';

const ALL_EVENTS: EventName[] = [
  'auth.user.registered',
  'articles.article.created',
  'articles.article.updated',
  'articles.article.deleted',
  'bookings.booking.created',
  'bookings.booking.paid',
  'bookings.booking.accepted',
  'bookings.booking.declined',
  'bookings.booking.expired',
  'payments.payment.succeeded',
  'payments.payment.failed',
  'payments.payment.refunded',
  'approvals.approval.requested',
  'approvals.approval.approved',
  'approvals.approval.rejected',
  'messages.message.posted',
  'notes.note.published',
  'notes.note.taken_down',
  'vault.answer.paid',
  'vault.answer.created',
  'vault.answer.generated',
  'vault.answer.failed',
  'vault.answer.rejected',
  'vault.answer.expired',
  'vault.answer.released',
];

/** Writes one info line per domain event. Add a name above when a new event is added to the map. */
export function registerLoggingSubscriber(bus: EventBus, logger: Logger): void {
  for (const name of ALL_EVENTS) {
    bus.on(name, (payload) => logger.info('Domain event', { event: name, ...payload }));
  }
}
