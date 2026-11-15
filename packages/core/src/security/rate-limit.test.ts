/** @jest-environment node */
import { TooManyRequestsError } from '../http/errors';
import { clientKey, createRateLimiter } from './rate-limit';

function setup() {
  let time = 1_000_000;
  const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000, cooldownMs: 300_000, now: () => time });
  return { limiter, advance: (ms: number) => (time += ms) };
}

describe('createRateLimiter', () => {
  it('allows attempts until the limit, then blocks with a Retry-After', () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) {
      limiter.assertAllowed('k');
      limiter.recordFailure('k');
    }

    try {
      limiter.assertAllowed('k');
      throw new Error('expected a block');
    } catch (error) {
      expect(error).toBeInstanceOf(TooManyRequestsError);
      expect((error as TooManyRequestsError).status).toBe(429);
      expect((error as TooManyRequestsError).headers).toEqual({ 'Retry-After': '300' });
    }
  });

  it('unblocks after the cooldown', () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure('k');
    expect(() => limiter.assertAllowed('k')).toThrow(TooManyRequestsError);

    advance(300_001);
    expect(() => limiter.assertAllowed('k')).not.toThrow();
  });

  it('forgets failures older than the window', () => {
    const { limiter, advance } = setup();
    limiter.recordFailure('k');
    limiter.recordFailure('k');
    advance(61_000);
    limiter.recordFailure('k');

    expect(() => limiter.assertAllowed('k')).not.toThrow();
  });

  it('counts per key and clears a key on success', () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure('a');
    expect(() => limiter.assertAllowed('a')).toThrow(TooManyRequestsError);
    expect(() => limiter.assertAllowed('b')).not.toThrow();

    limiter.recordFailure('c');
    limiter.reset('c');
    limiter.recordFailure('c');
    limiter.recordFailure('c');
    expect(() => limiter.assertAllowed('c')).not.toThrow();
  });
});

describe('clientKey', () => {
  it('combines the first forwarded address with the extra parts', () => {
    const request = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } });
    expect(clientKey(request, 'a@b.co')).toBe('1.2.3.4|a@b.co');
    expect(clientKey(new Request('http://x'))).toBe('unknown');
  });
});
