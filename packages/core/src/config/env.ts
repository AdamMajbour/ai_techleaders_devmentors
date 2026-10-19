import { z } from 'zod';

/** A secret shorter than this cannot hold 32 random bytes in any common encoding. */
const MIN_SECRET_LENGTH = 32;

const envSchema = z.object({
  // Generate with: openssl rand -base64 48
  JWT_SECRET: z.string().min(MIN_SECRET_LENGTH, `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (use 32+ random bytes)`),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Validates an environment; throws a message that names the offending variables, never their values. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ');
  throw new Error(`Invalid environment configuration: ${names}. See .env.example.`);
}

let cached: Env | null = null;

/**
 * The validated environment, read on first use rather than at import time, so the app still
 * builds and boots without secrets; only the routes that need them fail.
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** For tests: forget the cached environment. */
export function resetEnvCache(): void {
  cached = null;
}
