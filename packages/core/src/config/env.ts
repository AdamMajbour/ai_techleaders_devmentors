import { z } from 'zod';

/** A secret shorter than this cannot hold 32 random bytes in any common encoding. */
const MIN_SECRET_LENGTH = 32;
const MAX_MENTOR_RESPONSE_WINDOW_MINUTES = 10_080;
const refundAutoApproveReasons = ['mentor_declined', 'mentor_unresponsive'] as const;

const publicSignupSchema = z.preprocess(
  (value) => {
    if (value === undefined) return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean(),
);

const mentorResponseWindowMinutesSchema = z.preprocess(
  (value) => (value === undefined || value === '' ? 120 : value),
  z.coerce.number().int().min(1).max(MAX_MENTOR_RESPONSE_WINDOW_MINUTES),
);
const mentorPublishWindowDaysSchema = z.preprocess(
  (value) => (value === undefined || value === '' ? 14 : value),
  z.coerce.number().int().min(1).max(365),
);

const refundAutoApproveReasonsSchema = z.preprocess(
  (value) =>
    value === undefined || value === ''
      ? []
      : typeof value === 'string'
        ? value.split(',').map((reason) => reason.trim()).filter(Boolean)
        : value,
  z.array(z.enum(refundAutoApproveReasons)),
);

const appBaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'https:' || url.protocol === 'http:') &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  }, 'APP_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment')
  .optional();

const bookingSettingsSchema = z.object({
  MENTOR_RESPONSE_WINDOW_MINUTES: mentorResponseWindowMinutesSchema,
  REFUND_AUTO_APPROVE_REASONS: refundAutoApproveReasonsSchema,
});

const optionalEmailValue = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().email().optional(),
);
const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z.object({
  // Generate with: openssl rand -base64 48
  JWT_SECRET: z.string().min(MIN_SECRET_LENGTH, `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (use 32+ random bytes)`),
  OPERATOR_USER_IDS: z.preprocess(
    (value) => parseOperatorUserIds(typeof value === 'string' ? value : undefined),
    z.array(z.string()),
  ),
  MENTOR_PUBLISH_WINDOW_DAYS: mentorPublishWindowDaysSchema,
  // Default preserves existing deployments; the pilot deployment can disable sign-up later.
  PUBLIC_SIGNUP: publicSignupSchema,
  // Optional for compatibility; magic-link requests require it when creating verification links.
  APP_BASE_URL: appBaseUrlSchema,
  GITHUB_CLIENT_ID: optionalNonEmptyString,
  GITHUB_CLIENT_SECRET: optionalNonEmptyString,
  DEMO_MENTEE_GITHUB_EMAIL: optionalEmailValue,
  DEMO_MENTOR_GITHUB_EMAIL: optionalEmailValue,
  DEMO_OPERATOR_GITHUB_EMAIL: optionalEmailValue,
  NODE_ENV: z.string().optional(),
});

const optionalMailerValue = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional(),
);

const mailerEnvSchema = z.object({
  MAILER_MODE: z.enum(['console', 'http']).default('console'),
  MAILER_API_KEY: optionalMailerValue,
  MAIL_FROM: optionalMailerValue,
}).superRefine((env, context) => {
  if (env.MAILER_MODE === 'http') {
    if (!env.MAILER_API_KEY) {
      context.addIssue({ code: 'custom', path: ['MAILER_API_KEY'], message: 'Required when MAILER_MODE=http' });
    }
    if (!env.MAIL_FROM) {
      context.addIssue({ code: 'custom', path: ['MAIL_FROM'], message: 'Required when MAILER_MODE=http' });
    }
  }
});

const optionalPaymentValue = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional(),
);

const paymentBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const aiSettingsSchema = z.object({
  AI_MODE: z.enum(['mock', 'anthropic']).default('mock'),
  AI_ALLOW_MOCK_IN_PRODUCTION: paymentBooleanSchema,
  AI_LIVE_ENABLED: paymentBooleanSchema,
  ANTHROPIC_API_KEY: optionalPaymentValue,
  ANTHROPIC_MODEL: z.preprocess((value) => value === undefined || value === '' ? 'claude-opus-5-5' : value, z.string().trim().min(1)),
  PAYMENTS_LIVE_ENABLED: paymentBooleanSchema,
  NODE_ENV: z.string().optional(),
}).superRefine((settings, context) => {
  if (settings.AI_MODE === 'mock' && settings.NODE_ENV === 'production'
    && (!settings.AI_ALLOW_MOCK_IN_PRODUCTION || settings.PAYMENTS_LIVE_ENABLED)) {
    context.addIssue({ code: 'custom', path: ['AI_MODE'], message: 'Mock AI is disabled in production unless rehearsal override is on and live payments are off.' });
  }
});

const vaultSettingsSchema = z.object({
  VAULT_ENABLED: paymentBooleanSchema,
  VAULT_PUBLISH_ENABLED: paymentBooleanSchema,
  NODE_ENV: z.string().optional(),
});

const paymentSettingsSchema = z.object({
  PAYMENTS_MODE: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: optionalPaymentValue,
  STRIPE_WEBHOOK_SECRET: optionalPaymentValue,
  PAYMENTS_LIVE_ENABLED: paymentBooleanSchema,
  STRIPE_CONNECT_ENABLED: paymentBooleanSchema,
}).superRefine((settings, context) => {
  if (
    settings.STRIPE_SECRET_KEY &&
    !/^sk_(test|live)_[A-Za-z0-9]+$/.test(settings.STRIPE_SECRET_KEY)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['STRIPE_SECRET_KEY'],
      message: 'Must be a valid Stripe secret key',
    });
  }
  if (
    settings.STRIPE_WEBHOOK_SECRET &&
    !/^whsec_[A-Za-z0-9]+$/.test(settings.STRIPE_WEBHOOK_SECRET)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['STRIPE_WEBHOOK_SECRET'],
      message: 'Must be a valid Stripe webhook secret',
    });
  }
  if (
    settings.STRIPE_SECRET_KEY?.startsWith('sk_live_') &&
    !settings.PAYMENTS_LIVE_ENABLED
  ) {
    context.addIssue({
      code: 'custom',
      path: ['PAYMENTS_LIVE_ENABLED'],
      message: 'Must be true to use a live Stripe secret key',
    });
  }
  if (settings.STRIPE_CONNECT_ENABLED && (settings.PAYMENTS_MODE !== 'stripe' || !settings.STRIPE_SECRET_KEY?.startsWith('sk_test_'))) {
    context.addIssue({ code: 'custom', path: ['STRIPE_CONNECT_ENABLED'], message: 'The E03 Express Connect pilot requires Stripe test mode and a test secret key.' });
  }
});

export type Env = z.infer<typeof envSchema>;
export type MailerSettings = z.infer<typeof mailerEnvSchema>;
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;
export type VaultSettings = { enabled: boolean; publishEnabled: boolean; isProduction: boolean };
export type AISettings = z.infer<typeof aiSettingsSchema>;

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

/** Required only by flows that send absolute links, keeping builds and unrelated routes lazy. */
export function getAppBaseUrl(): string {
  const { APP_BASE_URL } = getEnv();
  if (!APP_BASE_URL) {
    throw new Error('Invalid environment configuration: APP_BASE_URL. See .env.example.');
  }
  return APP_BASE_URL;
}

export function parseMailerSettings(source: Record<string, string | undefined>): MailerSettings {
  const result = mailerEnvSchema.safeParse(source);
  if (result.success) return result.data;

  const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ');
  throw new Error(`Invalid environment configuration: ${names}. See .env.example.`);
}

export function getMailerSettings(): MailerSettings {
  return parseMailerSettings(process.env);
}

export function parsePaymentSettings(source: Record<string, string | undefined>): PaymentSettings {
  const result = paymentSettingsSchema.safeParse(source);
  if (result.success) return result.data;

  const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ');
  throw new Error(`Invalid payment configuration: ${names}. See .env.example.`);
}

/** Payment settings stay independent of the required app secrets and are read only when needed. */
export function getPaymentSettings(): PaymentSettings {
  return parsePaymentSettings(process.env);
}

/** Booking settings are independent of secrets and validated only when booking workflows need them. */
export function parseBookingSettings(source: Record<string, string | undefined>): BookingSettings {
  const result = bookingSettingsSchema.safeParse(source);
  if (result.success) return result.data;

  const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ');
  throw new Error(`Invalid booking configuration: ${names}. See .env.example.`);
}

export function getBookingSettings(): BookingSettings {
  return parseBookingSettings(process.env);
}

/** Production publication stays off until the E03-T02 review gate is recorded. */
export function parseVaultSettings(source: Record<string, string | undefined>): VaultSettings {
  const result = vaultSettingsSchema.safeParse(source);
  if (!result.success) {
    throw new Error('Invalid vault configuration: VAULT_PUBLISH_ENABLED. See .env.example.');
  }
  return {
    enabled: result.data.VAULT_ENABLED,
    publishEnabled: result.data.VAULT_PUBLISH_ENABLED,
    isProduction: result.data.NODE_ENV === 'production',
  };
}

export function getVaultSettings(): VaultSettings {
  return parseVaultSettings(process.env);
}

export function parseAISettings(source: Record<string, string | undefined>): AISettings {
  const result = aiSettingsSchema.safeParse(source);
  if (result.success) return result.data;
  const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ');
  throw new Error(`Invalid AI configuration: ${names}. See .env.example.`);
}

export function getAISettings(): AISettings {
  return parseAISettings(process.env);
}

/** Fails before charging unless the selected adapter is explicitly usable. */
export function assertAIReadyToCharge(settings: AISettings): void {
  if (settings.AI_MODE === 'anthropic' && (!settings.AI_LIVE_ENABLED || !settings.ANTHROPIC_API_KEY)) {
    throw new Error('AI generation is not configured for paid answers.');
  }
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
