import { UniqueConstraintViolationException } from '@mikro-orm/core';

/** True when a write failed because a unique constraint (e.g. the e-mail of a user) was violated. */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof UniqueConstraintViolationException;
}
