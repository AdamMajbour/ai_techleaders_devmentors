// Core package, server-only entry (`@devmentor/core/server`): imports the database package,
// so never import it from client components.
export { apiHandler, jsonResponse } from './http/apiHandler';
export { makeCrudRoute, type CrudRouteConfig } from './http/makeCrudRoute';
export { requireSession, optionalSession, assertOwns, issueSessionCookie, clearSessionCookie } from './http/auth';
export { readJsonBody } from './http/body';
export { getEnv, parseEnv } from './config/env';
export { createLogger, redact, type Logger, type LogContext } from './logger';
export { createEventBus, type EventBus } from './events/event-bus';
export type { EventMap, EventName } from './events/event-map';
export { buildContainer, getContainer, withScope, type AppContainer } from './container/container';
export type { Cradle, OrmLike } from './container/cradle';
export { ArticleService } from './services/articles/article.service';
export { AuthService } from './services/auth/auth.service';
export { UserService } from './services/auth/user.service';
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

export { SessionNoteService } from './services/notes/session-note.service';
