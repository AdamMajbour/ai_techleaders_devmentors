import { z } from 'zod';

/** A secret shorter than this cannot hold 32 random bytes in any common encoding. */
const MIN_SECRET_LENGTH = 32;

const publicSignupSchema = z.preprocess(
  (value) => {
    if (value === undefined) return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean(),
);

const envSchema = z.object({
  // Generate with: openssl rand -base64 48
  JWT_SECRET: z.string().min(MIN_SECRET_LENGTH, `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (use 32+ random bytes)`),
  OPERATOR_USER_IDS: z.preprocess(
    (value) => parseOperatorUserIds(typeof value === 'string' ? value : undefined),
    z.array(z.string()),
  ),
  // Default preserves existing deployments; the pilot deployment can disable sign-up later.
  PUBLIC_SIGNUP: publicSignupSchema,
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

/** Invalid or empty operator configuration grants no operator access. */
export function parseOperatorUserIds(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  const ids = value.split(',').map((id) => id.trim());
  if (ids.some((id) => !id || !z.uuid().safeParse(id).success)) return [];
  return [...new Set(ids)];
}

/** Read independently from required secrets so operator checks stay lazy and startup-safe. */
export function getOperatorUserIds(): string[] {
  return parseOperatorUserIds(process.env.OPERATOR_USER_IDS);
}

/** For tests: forget the cached environment. */
export function resetEnvCache(): void {
  cached = null;
}
