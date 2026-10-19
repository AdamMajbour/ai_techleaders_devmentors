import { createRateLimiter } from './rate-limit';

const MINUTE_MS = 60_000;

/** 5 failed logins per client and e-mail in 15 minutes, then a 15 minute cooldown: slows guessing, rarely hits a real user. */
export const loginLimiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * MINUTE_MS, cooldownMs: 15 * MINUTE_MS });

/** Every sign-up attempt counts: 10 per client per hour, then a one hour cooldown, so accounts cannot be mass-produced. */
export const registerLimiter = createRateLimiter({ maxAttempts: 10, windowMs: 60 * MINUTE_MS, cooldownMs: 60 * MINUTE_MS });
