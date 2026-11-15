/**
 * Every domain event, keyed by `concept.entity.action` (past tense). Payloads carry IDs, not
 * personal data, so a subscriber that logs them cannot leak any.
 */
export interface EventMap {
  'auth.user.registered': { userId: string };
  'articles.article.created': { articleId: string; authorId: string };
  'articles.article.updated': { articleId: string; authorId: string };
  'articles.article.deleted': { articleId: string; authorId: string };
  'bookings.booking.created': { bookingId: string; seekerId: string; mentorId: string };
  'bookings.booking.paid': { bookingId: string };
  'bookings.booking.accepted': { bookingId: string };
  'bookings.booking.declined': { bookingId: string };
  'bookings.booking.expired': { bookingId: string };
  'payments.payment.succeeded': { paymentId: string };
  'payments.payment.failed': { paymentId: string };
  'payments.payment.refunded': { paymentId: string };
  'approvals.approval.requested': { approvalId: string };
  'approvals.approval.approved': { approvalId: string };
  'approvals.approval.rejected': { approvalId: string };
  'messages.message.posted': { messageId: string; bookingId: string; authorId: string };
  'notes.note.published': { noteId: string; mentorId: string };
  'notes.note.taken_down': { noteId: string; mentorId: string };
  'vault.answer.paid': { answerId: string };
  'vault.answer.created': { answerId: string; seekerId: string };
  'vault.answer.generated': { answerId: string };
  'vault.answer.failed': { answerId: string };
  'vault.answer.rejected': { answerId: string };
  'vault.answer.expired': { answerId: string };
  'vault.answer.released': { answerId: string };
}

export type EventName = keyof EventMap;
