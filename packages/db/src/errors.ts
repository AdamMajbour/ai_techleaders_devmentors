import { UniqueConstraintViolationException } from '@mikro-orm/core';

export class StatusTransitionConflictError extends Error {
  constructor(message = 'The request conflicts with the current state.') {
    super(message);
    this.name = new.target.name;
  }
}

export class PendingApprovalConflictError extends Error {
  constructor() {
    super('An approval is already pending for this subject.');
    this.name = new.target.name;
  }
}

export class ExclusionConstraintViolationError extends Error {
  constructor(message = 'A database exclusion constraint was violated.') {
    super(message);
    this.name = new.target.name;
  }
}

/** True when a write failed because a unique constraint (e.g. the e-mail of a user) was violated. */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof UniqueConstraintViolationException;
}

/** True when PostgreSQL reports SQLSTATE 23P01, including through a wrapped driver cause. */
export function isExclusionConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (candidate.code === '23P01') return true;
  return candidate.cause !== undefined && candidate.cause !== error
    ? isExclusionConstraintViolation(candidate.cause)
    : false;
}
