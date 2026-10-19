import { HTTP_STATUS } from '../constants';

export type FieldErrors = Record<string, string[]>;

/** Base of every error a service may throw. Services never build HTTP responses; `apiHandler` maps these. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly fieldErrors?: FieldErrors,
    /** Extra response headers, e.g. Retry-After. */
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request is invalid.', fieldErrors?: FieldErrors) {
    super(message, 'validation_failed', HTTP_STATUS.BAD_REQUEST, fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(message, 'unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this.') {
    super(message, 'forbidden', HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 'not_found', HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The request conflicts with the current state.') {
    super(message, 'conflict', HTTP_STATUS.CONFLICT);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds: number) {
    super('Too many attempts. Try again later.', 'too_many_requests', HTTP_STATUS.TOO_MANY_REQUESTS, undefined, {
      'Retry-After': String(retryAfterSeconds),
    });
  }
}
