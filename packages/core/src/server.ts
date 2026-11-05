// Core package, server-only entry (`@devmentor/core/server`): imports the database package,
// so never import it from client components.
import {
  requirePilotMember as requirePilotMemberWithResolver,
  type PilotMemberResolver,
} from './http/auth';
import type { Session } from './security/session';
import { withScope } from './container/container';
import type { InvitationService } from './services/auth/invitation.service';

export { apiHandler, jsonResponse } from './http/apiHandler';
export { makeCrudRoute, type CrudRouteConfig } from './http/makeCrudRoute';
export { makeActionRoute, type ActionRouteConfig } from './http/makeActionRoute';
export {
  makeWebhookRoute,
  type WebhookRouteConfig,
  type WebhookVerification,
} from './http/makeWebhookRoute';
export {
  MOCK_PAYMENT_SIGNATURE_HEADER,
  MOCK_PAYMENT_SIGNATURE_VALUE,
  verifyMockPaymentWebhook,
} from './services/payments/mock-webhook-verifier';
export { verifyConfiguredPaymentWebhook } from './services/payments/payment-gateway.factory';
export { StripePaymentGateway } from './services/payments/adapters/stripe-payment-gateway';

export {
  requireSession,
  optionalSession,
  assertOwns,
  requireOperator,
  assertParticipant,
  issueSessionCookie,
  clearSessionCookie,
} from './http/auth';
export type { PilotMemberResolver } from './http/auth';

export function createPilotMemberResolver(
  invitationService: Pick<InvitationService, 'isPilotMember'>,
): PilotMemberResolver {
  return (session: Session) => invitationService.isPilotMember(session.userId);
}

/** Uses the invitation-backed resolver by default; tests and specialized callers may override it. */
export function requirePilotMember(
  request: Request,
  resolver?: PilotMemberResolver,
  secret?: string,
): Promise<Session> {
  const defaultResolver: PilotMemberResolver = (session, resolverRequest) =>
    withScope(async ({ invitationService }) =>
      createPilotMemberResolver(invitationService)(session, resolverRequest),
    );
  return requirePilotMemberWithResolver(request, resolver ?? defaultResolver, secret);
}
export { readJsonBody } from './http/body';
export {
  getBookingSettings,
  getAppBaseUrl,
  getEnv,
  getMailerSettings,
  getPaymentSettings,
  parseEnv,
  parseBookingSettings,
  parsePaymentSettings,
  getOperatorUserIds,
  parseOperatorUserIds,
} from './config/env';
export { createLogger, redact, type Logger, type LogContext } from './logger';
export { createEventBus, type EventBus } from './events/event-bus';
export type { EventMap, EventName } from './events/event-map';
export { registerMailSubscriber, type MailEventRegistrar } from './events/mail-subscriber';
export { buildContainer, getContainer, withScope, type AppContainer } from './container/container';
export type { Cradle, OrmLike } from './container/cradle';
export { ArticleService } from './services/articles/article.service';
export {
  MentorService,
  normalizeMentorSlug,
  normalizeTechnologySlugs,
  type MentorProfileChanges,
  type MentorProfileDto,
  type MentorProfileInput,
} from './services/mentors/mentor.service';
export { BookingService, type BookingCreationResult } from './services/bookings/booking.service';
export { PaymentService } from './services/payments/payment.service';
export { AuthService } from './services/auth/auth.service';
export { UserService } from './services/auth/user.service';
export {
  InvitationService,
  normalizeInvitationEmail,
  type InvitationDto,
  type InviteInput,
  type InvitationRole,
} from './services/auth/invitation.service';
export {
  INVALID_MAGIC_LINK_MESSAGE,
  MAGIC_LINK_TTL_MS,
  MagicLinkService,
} from './services/auth/magic-link.service';
export {
  ApprovalService,
  defaultApproverResolvers,
  type ApprovalDecision,
  type ApprovalStatus,
  type ApprovalRequestDetails,
  type ApprovalSubject,
  type ApproverResolver,
  type ApproverResolvers,
} from './services/approvals/approval.service';
export type {
  CheckoutCompletedEvent,
  CheckoutExpiredEvent,
  CheckoutFailedEvent,
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedPaymentEvent,
  PaymentGateway,
  RefundInput,
} from './services/payments/payment-gateway.port';
export { MockPaymentGateway } from './services/payments/adapters/mock-payment-gateway';
export { ConsoleMailer } from './services/notifications/adapters/console-mailer';
export { HttpMailer } from './services/notifications/adapters/http-mailer';
export { ConfiguredMailer } from './services/notifications/adapters/configured-mailer';
export type { Mailer, MailMessage } from './services/notifications/mailer.port';
export { hashPassword, verifyPassword, BCRYPT_COST } from './security/password';
export {
  signSession,
  verifySession,
  buildSessionCookie,
  buildClearedSessionCookie,
  readSessionCookie,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from './security/session';
export { assertCsrfSafe } from './security/csrf';
export { createRateLimiter, clientKey, type RateLimiter } from './security/rate-limit';
export { withFailureLimit } from './security/guarded';
export {
  loginLimiter,
  magicLinkConsumeLimiter,
  magicLinkRequestLimiter,
  registerLimiter,
} from './security/limiters';
export { systemClock, type Clock } from './utils/clock';
