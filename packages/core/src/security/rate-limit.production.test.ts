/** @jest-environment node */
import { TooManyRequestsError } from '../http/errors';
import { createRateLimiter } from './rate-limit';

describe('production rate limit bypass protection', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRestlerFlag = process.env.RESTLER_DISABLE_RATE_LIMIT;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalRestlerFlag === undefined) delete process.env.RESTLER_DISABLE_RATE_LIMIT;
    else process.env.RESTLER_DISABLE_RATE_LIMIT = originalRestlerFlag;
  });

  it('continues blocking failed logins when the local RESTler bypass flag leaks into production', () => {
    process.env.NODE_ENV = 'production';
    process.env.RESTLER_DISABLE_RATE_LIMIT = 'true';
    let time = 1_000_000;
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000, cooldownMs: 300_000, now: () => time });

    for (let attempt = 0; attempt < 3; attempt += 1) limiter.recordFailure('attacker');

    expect(() => limiter.assertAllowed('attacker')).toThrow(TooManyRequestsError);
    time += 300_001;
    expect(() => limiter.assertAllowed('attacker')).not.toThrow();
  });
});
