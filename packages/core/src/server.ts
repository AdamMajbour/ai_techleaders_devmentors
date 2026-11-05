// Core package, server-only entry (`@devmentor/core/server`): imports the database package,
// so never import it from client components.
export { apiHandler, jsonResponse } from './http/apiHandler';
export { makeCrudRoute, type CrudRouteConfig } from './http/makeCrudRoute';
export { makeActionRoute, type ActionRouteConfig } from './http/makeActionRoute';
export {
  makeWebhookRoute,
  type WebhookRouteConfig,
  type WebhookVerification,
} from './http/makeWebhookRoute';
export {
  requireSession,
  optionalSession,
  assertOwns,
  requireOperator,
  assertParticipant,
  requirePilotMember,
  issueSessionCookie,
  clearSessionCookie,
  type PilotMemberResolver,
} from './http/auth';
export { readJsonBody } from './http/body';
export { getEnv, parseEnv, getOperatorUserIds, parseOperatorUserIds } from './config/env';
export { createLogger, redact, type Logger, type LogContext } from './logger';
export { createEventBus, type EventBus } from './events/event-bus';
export type { EventMap, EventName } from './events/event-map';
export { buildContainer, getContainer, withScope, type AppContainer } from './container/container';
export type { Cradle, OrmLike } from './container/cradle';
export { ArticleService } from './services/articles/article.service';
export { AuthService } from './services/auth/auth.service';
export { UserService } from './services/auth/user.service';
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
export { loginLimiter, registerLimiter } from './security/limiters';
export { systemClock, type Clock } from './utils/clock';
