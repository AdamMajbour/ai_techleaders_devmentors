import { UnauthorizedError } from '../http/errors';
import type { RateLimiter } from './rate-limit';

/**
 * Runs a login-like action under a brute-force limit: blocked keys are refused before any work
 * (and any password hashing) happens, a failed attempt counts against the key, a success clears it.
 */
export async function withFailureLimit<T>(limiter: RateLimiter, key: string, action: () => Promise<T>): Promise<T> {
  limiter.assertAllowed(key);
  try {
    const result = await action();
    limiter.reset(key);
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) limiter.recordFailure(key);
    throw error;
  }
}
