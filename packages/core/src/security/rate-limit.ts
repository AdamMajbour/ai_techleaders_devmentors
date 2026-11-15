import { TooManyRequestsError } from '../http/errors';

export interface RateLimiterOptions {
  /** Failures allowed inside the window before the key is blocked. */
  maxAttempts: number;
  windowMs: number;
  /** How long a blocked key stays blocked. */
  cooldownMs: number;
  now?: () => number;
}

type Entry = { failures: number[]; blockedUntil: number };

/**
 * Brute-force control for login and registration: a per-key failure counter with a cooldown.
 * It lives in this process's memory, so it resets on restart and is not shared between instances;
 * it needs a shared store (e.g. Redis) before real production traffic.
 */
export function createRateLimiter({ maxAttempts, windowMs, cooldownMs, now = Date.now }: RateLimiterOptions) {
  const entries = new Map<string, Entry>();

  function purge(time: number) {
    for (const [key, entry] of entries) {
      const stillCounting = entry.failures.some((failure) => time - failure < windowMs);
      if (!stillCounting && entry.blockedUntil <= time) entries.delete(key);
    }
  }

  return {
    /** Throws `TooManyRequestsError` while the key is blocked. */
    assertAllowed(key: string): void {
      if (process.env.NODE_ENV !== 'production' && process.env.RESTLER_DISABLE_RATE_LIMIT === 'true') return;
      const time = now();
      const blockedUntil = entries.get(key)?.blockedUntil ?? 0;
      if (blockedUntil > time) throw new TooManyRequestsError(Math.ceil((blockedUntil - time) / 1000));
    },

    recordFailure(key: string): void {
      if (process.env.NODE_ENV !== 'production' && process.env.RESTLER_DISABLE_RATE_LIMIT === 'true') return;
      const time = now();
      purge(time);
      const entry = entries.get(key) ?? { failures: [], blockedUntil: 0 };
      entry.failures = [...entry.failures.filter((failure) => time - failure < windowMs), time];
      if (entry.failures.length >= maxAttempts) {
        entry.blockedUntil = time + cooldownMs;
        entry.failures = [];
      }
      entries.set(key, entry);
    },

    reset(key: string): void {
      entries.delete(key);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/** The caller's address as the proxy reports it. Behind no trusted proxy this header is spoofable; see above. */
export function clientKey(request: Request, ...parts: string[]): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return [ip, ...parts].join('|');
}
