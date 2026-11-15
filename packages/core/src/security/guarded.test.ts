import { ForbiddenError, TooManyRequestsError, UnauthorizedError } from '../http/errors';
import { withFailureLimit } from './guarded';
import { createRateLimiter } from './rate-limit';

const limiter = () => createRateLimiter({ maxAttempts: 2, windowMs: 60_000, cooldownMs: 60_000 });
const fail = () => Promise.reject(new UnauthorizedError());

describe('withFailureLimit', () => {
  it('returns the result and clears earlier failures on success', async () => {
    const l = limiter();
    await expect(withFailureLimit(l, 'k', fail)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(withFailureLimit(l, 'k', async () => 'ok')).resolves.toBe('ok');
    await expect(withFailureLimit(l, 'k', fail)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(withFailureLimit(l, 'k', async () => 'still ok')).resolves.toBe('still ok');
  });

  it('blocks after the failure limit and then refuses without running the action', async () => {
    const l = limiter();
    await expect(withFailureLimit(l, 'k', fail)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(withFailureLimit(l, 'k', fail)).rejects.toBeInstanceOf(UnauthorizedError);

    const action = jest.fn(async () => 'never');
    await expect(withFailureLimit(l, 'k', action)).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(action).not.toHaveBeenCalled();
  });

  it('counts only authentication failures, not other errors', async () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) {
      await expect(withFailureLimit(l, 'k', () => Promise.reject(new ForbiddenError()))).rejects.toBeInstanceOf(ForbiddenError);
    }
    await expect(withFailureLimit(l, 'k', async () => 'ok')).resolves.toBe('ok');
  });
});
