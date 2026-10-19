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
  INTERNAL_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please try again.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;
