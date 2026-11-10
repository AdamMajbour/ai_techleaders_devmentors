// Core package, isomorphic entry: types, utilities, constants, typed errors and shared Zod schemas.
// Safe to import from anywhere (also client code). It never imports next, react or the ORM.
// Server-only pieces (DI container, services, API handler) live in `@devmentor/core/server`.
export * from './types';
export * from './utils';
export * from './constants';
export * from './workflow/state-machine';
export * from './workflow/booking-state-machine';
export * from './workflow/payment-state-machine';
export * from './http/errors';
export type { ApiEnvelope } from './http/envelope';
export * from './validators/parse';
export * from './validators/id.schema';
export * from './validators/auth/register.schema';
export * from './validators/auth/login.schema';
export * from './validators/auth/magic-link.schema';
export * from './validators/auth/operator-user-list.schema';
export * from './validators/articles/article-create.schema';
export * from './validators/articles/article-update.schema';
export * from './validators/articles/article-list.schema';
export * from './validators/mentors/mentor-profile.schema';
export * from './validators/bookings/booking-create.schema';
export * from './validators/bookings/availability-slot.schema';
export * from './validators/bookings/booking-list.schema';
export * from './validators/bookings/booking-action.schema';
export * from './validators/bookings/booking-accept.schema';
export * from './validators/approvals/refund-approval-action.schema';
export * from './validators/messages/message.schema';
export * from './validators/notes/note.schema';
export { VAULT_NOTICE_DRAFT_LABEL, VAULT_NOTICE_ITEMS, VAULT_NOTICE_VERSION } from './validators/notes/notice';
export type {
  ArticleDto,
  BookingDto,
  BookingReadDto,
  BookingPage,
  RefundApprovalDto,
  UserDto,
  Page,
} from './services/dto';
export { CLIENT_HEADER_NAME, CLIENT_HEADER_VALUE } from './security/csrf';
export type { Session } from './security/session';
