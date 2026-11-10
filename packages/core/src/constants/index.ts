// Application constants
// Place all constant values here

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const DEBOUNCE_DELAY = 300; // ms

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please try again.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;

/** bcrypt ignores everything after 72 bytes, so longer passwords are rejected up front. Lives here so client code can validate without pulling in bcrypt. */
export const PASSWORD_MAX_LENGTH = 72;

export const SESSION_25_PRICE_MINOR = 2500;
export const CURRENCY = 'EUR';
export const SESSION_DURATION_MINUTES = 25;
export const VAULT_ANSWER_PRICE_MINOR = 1000;
export const MENTOR_SHARE_BP = 8000;
export { DEFAULT_VAULT_PREVIEW_UNTIL, isPreviewRequired } from './pilot';
