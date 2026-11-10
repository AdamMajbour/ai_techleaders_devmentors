import {
  parseBookingSettings,
  parseEnv,
  parseMailerSettings,
  parseOperatorUserIds,
  parsePaymentSettings,
  parseVaultSettings,
  parseAISettings,
  assertAIReadyToCharge,
} from './env';

describe('parseEnv', () => {
  it('accepts a long enough JWT secret', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).JWT_SECRET).toHaveLength(32);
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).OPERATOR_USER_IDS).toEqual([]);
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).PUBLIC_SIGNUP).toBe(true);
  });

  describe('parseBookingSettings', () => {
    it('defaults the response window and leaves automatic refund reasons empty', () => {
      expect(parseBookingSettings({})).toEqual({
        MENTOR_RESPONSE_WINDOW_MINUTES: 120,
        REFUND_AUTO_APPROVE_REASONS: [],
      });
    });

    it('accepts a bounded positive integer and only supported refund reasons', () => {
      expect(parseBookingSettings({
        MENTOR_RESPONSE_WINDOW_MINUTES: '60',
        REFUND_AUTO_APPROVE_REASONS: 'mentor_declined, mentor_unresponsive',
      })).toEqual({
        MENTOR_RESPONSE_WINDOW_MINUTES: 60,
        REFUND_AUTO_APPROVE_REASONS: ['mentor_declined', 'mentor_unresponsive'],
      });
      expect(() => parseBookingSettings({ MENTOR_RESPONSE_WINDOW_MINUTES: '0' }))
        .toThrow(/MENTOR_RESPONSE_WINDOW_MINUTES/);
      expect(() => parseBookingSettings({ MENTOR_RESPONSE_WINDOW_MINUTES: '10081' }))
        .toThrow(/MENTOR_RESPONSE_WINDOW_MINUTES/);
      expect(() => parseBookingSettings({ MENTOR_RESPONSE_WINDOW_MINUTES: '1.5' }))
        .toThrow(/MENTOR_RESPONSE_WINDOW_MINUTES/);
      expect(() => parseBookingSettings({ REFUND_AUTO_APPROVE_REASONS: 'unknown' }))
        .toThrow(/REFUND_AUTO_APPROVE_REASONS/);
    });
  });

  describe('parsePaymentSettings', () => {
    it('defaults to mock mode without requiring Stripe credentials', () => {
      expect(parsePaymentSettings({})).toEqual({
        PAYMENTS_MODE: 'mock',
        STRIPE_SECRET_KEY: undefined,
        STRIPE_WEBHOOK_SECRET: undefined,
        PAYMENTS_LIVE_ENABLED: false,
      });
    });

    it('accepts test keys and defaults live payments to disabled', () => {
      expect(parsePaymentSettings({
        PAYMENTS_MODE: 'stripe',
        STRIPE_SECRET_KEY: 'sk_test_valid123',
        STRIPE_WEBHOOK_SECRET: 'whsec_valid123',
      })).toMatchObject({
        PAYMENTS_MODE: 'stripe',
        PAYMENTS_LIVE_ENABLED: false,
      });
    });

    it('rejects invalid keys, invalid webhook secrets, and live keys without the explicit flag', () => {
      expect(() => parsePaymentSettings({ PAYMENTS_MODE: 'stripe', STRIPE_SECRET_KEY: 'not-a-key' }))
        .toThrow(/STRIPE_SECRET_KEY/);
      expect(() => parsePaymentSettings({ STRIPE_WEBHOOK_SECRET: 'not-a-secret' }))
        .toThrow(/STRIPE_WEBHOOK_SECRET/);
      expect(() => parsePaymentSettings({
        PAYMENTS_MODE: 'stripe',
        STRIPE_SECRET_KEY: 'sk_live_secret123',
      })).toThrow(/PAYMENTS_LIVE_ENABLED/);
    });

    it('allows a live key only with PAYMENTS_LIVE_ENABLED=true', () => {
      expect(parsePaymentSettings({
        PAYMENTS_MODE: 'stripe',
        STRIPE_SECRET_KEY: 'sk_live_secret123',
        PAYMENTS_LIVE_ENABLED: 'true',
      }).PAYMENTS_LIVE_ENABLED).toBe(true);
      expect(() => parsePaymentSettings({
        PAYMENTS_LIVE_ENABLED: 'yes',
      })).toThrow(/PAYMENTS_LIVE_ENABLED/);
    });
  });

  it('parses PUBLIC_SIGNUP lazily from environment strings', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32), PUBLIC_SIGNUP: 'false' }).PUBLIC_SIGNUP).toBe(false);
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32), PUBLIC_SIGNUP: 'true' }).PUBLIC_SIGNUP).toBe(true);
    expect(() => parseEnv({ JWT_SECRET: 'x'.repeat(32), PUBLIC_SIGNUP: 'no' })).toThrow(/PUBLIC_SIGNUP/);
  });

  it('does not validate booking-only settings while reading unrelated auth settings', () => {
    expect(parseEnv({
      JWT_SECRET: 'x'.repeat(32),
      MENTOR_RESPONSE_WINDOW_MINUTES: 'not-a-number',
    }).JWT_SECRET).toHaveLength(32);
    expect(() => parseBookingSettings({ MENTOR_RESPONSE_WINDOW_MINUTES: 'not-a-number' }))
      .toThrow(/MENTOR_RESPONSE_WINDOW_MINUTES/);
  });

  it('defaults the mailer to console and requires credentials only for HTTP delivery', () => {
    const secret = 'x'.repeat(32);
    expect(parseMailerSettings({}).MAILER_MODE).toBe('console');
    expect(parseMailerSettings({ MAILER_API_KEY: '', MAIL_FROM: '' }).MAILER_MODE).toBe('console');
    expect(
      parseMailerSettings({
        MAILER_MODE: 'http',
        MAILER_API_KEY: 'test-key',
        MAIL_FROM: 'DevMentor <hello@example.com>',
      }),
    ).toMatchObject({
      MAILER_MODE: 'http',
      MAILER_API_KEY: 'test-key',
      MAIL_FROM: 'DevMentor <hello@example.com>',
    });
    expect(() => parseMailerSettings({ MAILER_MODE: 'http', MAIL_FROM: 'hello@example.com' })).toThrow(
      /MAILER_API_KEY/,
    );
    expect(() => parseMailerSettings({ MAILER_MODE: 'http', MAILER_API_KEY: 'test-key' })).toThrow(
      /MAIL_FROM/,
    );
    expect(() => parseMailerSettings({ MAILER_MODE: 'smtp' })).toThrow(/MAILER_MODE/);
    expect(
      parseEnv({
        JWT_SECRET: secret,
        APP_BASE_URL: 'https://app.example.com',
        MAILER_MODE: 'http',
      }).APP_BASE_URL,
    ).toBe('https://app.example.com');
  });

  it('accepts a configured HTTP(S) app origin and rejects unsafe or malformed values', () => {
    const secret = 'x'.repeat(32);
    const credentialsUrl = new URL('https://app.example.com');
    credentialsUrl.username = 'user';
    credentialsUrl.password = 'pass';
    expect(parseEnv({ JWT_SECRET: secret, APP_BASE_URL: 'https://app.example.com' }).APP_BASE_URL).toBe(
      'https://app.example.com',
    );
    expect(parseEnv({ JWT_SECRET: secret, APP_BASE_URL: 'http://localhost:3000' }).APP_BASE_URL).toBe(
      'http://localhost:3000',
    );

    for (const APP_BASE_URL of [
      'not-a-url',
      'ftp://app.example.com',
      credentialsUrl.toString(),
      'https://user:password@app.example.com',
      'https://app.example.com/path',
      'https://app.example.com/?next=https://attacker.example',
      'https://app.example.com/#fragment',
    ]) {
      expect(() => parseEnv({ JWT_SECRET: secret, APP_BASE_URL })).toThrow(/APP_BASE_URL/);
    }
  });

  it('rejects a missing or short secret and names the variable, never its value', () => {
    expect(() => parseEnv({})).toThrow(/JWT_SECRET/);
    const weak = 'short-secret-value';
    expect(() => parseEnv({ JWT_SECRET: weak })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ JWT_SECRET: weak })).not.toThrow(new RegExp(weak));
  });

  it('accepts malformed operator configuration without turning it into a startup error', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32), OPERATOR_USER_IDS: 'not-an-id' }).OPERATOR_USER_IDS).toEqual([]);
    expect(parseOperatorUserIds('not-an-id')).toEqual([]);
  });
});

describe('parseVaultSettings', () => {
  it('keeps production publishing disabled unless explicitly enabled', () => {
    expect(parseVaultSettings({ NODE_ENV: 'production' })).toEqual({ enabled: false, publishEnabled: false, isProduction: true });
    expect(parseVaultSettings({ NODE_ENV: 'production', VAULT_PUBLISH_ENABLED: 'true' })).toEqual({ enabled: false, publishEnabled: true, isProduction: true });
    expect(parseVaultSettings({ NODE_ENV: 'development' })).toEqual({ enabled: false, publishEnabled: false, isProduction: false });
  });
});

describe('AI settings', () => {
  it('defaults to mock locally and fails closed for paid Anthropic generation', () => {
    expect(parseAISettings({}).AI_MODE).toBe('mock');
    expect(() => assertAIReadyToCharge(parseAISettings({ AI_MODE: 'anthropic', ANTHROPIC_API_KEY: 'key' })))
      .toThrow(/not configured/i);
    expect(() => assertAIReadyToCharge(parseAISettings({
      AI_MODE: 'anthropic',
      AI_LIVE_ENABLED: 'true',
      ANTHROPIC_API_KEY: 'key',
    }))).not.toThrow();
  });

  it('refuses mock generation in production unless rehearsal override is isolated from live payments', () => {
    expect(() => parseAISettings({ NODE_ENV: 'production' })).toThrow(/AI_MODE/);
    expect(parseAISettings({
      NODE_ENV: 'production',
      AI_ALLOW_MOCK_IN_PRODUCTION: 'true',
      PAYMENTS_LIVE_ENABLED: 'false',
    }).AI_MODE).toBe('mock');
    expect(() => parseAISettings({
      NODE_ENV: 'production',
      AI_ALLOW_MOCK_IN_PRODUCTION: 'true',
      PAYMENTS_LIVE_ENABLED: 'true',
    })).toThrow(/AI_MODE/);
  });
});
