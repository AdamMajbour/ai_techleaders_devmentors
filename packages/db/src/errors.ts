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

/** True when a write failed because a unique constraint (e.g. the e-mail of a user) was violated. */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof UniqueConstraintViolationException;
}
