import { createHash, randomBytes } from 'node:crypto';
import type { LoginTokenRepository } from '@devmentor/db';
import type { Logger } from '../../logger';
import type { Mailer } from '../notifications/mailer.port';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from './invitation.service';
import { INVALID_MAGIC_LINK_MESSAGE } from './magic-link.constants';

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const ACCOUNT_LOGIN_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export { INVALID_MAGIC_LINK_MESSAGE };

function tokenHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function tokenBytes(token: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const bytes = Buffer.from(token, 'base64url');
  return bytes.length === 32 && bytes.toString('base64url') === token ? bytes : null;
}

export class MagicLinkService {
  private readonly loginTokenRepository: LoginTokenRepository;
  private readonly invitationService: InvitationService;
  private readonly clock: Clock;
  private readonly mailer: Mailer;
  private readonly logger: Logger;

  constructor({
    loginTokenRepository,
    invitationService,
    clock,
    mailer,
    logger,
  }: {
    loginTokenRepository: LoginTokenRepository;
    invitationService: InvitationService;
    clock: Clock;
    mailer: Mailer;
    logger: Logger;
  }) {
    this.loginTokenRepository = loginTokenRepository;
    this.invitationService = invitationService;
    this.clock = clock;
    this.mailer = mailer;
    this.logger = logger;
  }

  async request(email: string, appUrl: string): Promise<void> {
    const issued = await this.issue(email);
    if (!issued) return;

    const verificationUrl = new URL('/auth/verify', appUrl);
    verificationUrl.searchParams.set('token', issued.token);
    try {
      await this.mailer.send({
        to: email.trim().toLowerCase(),
        template: 'magic-link',
        data: { url: verificationUrl.toString() },
      });
    } catch {
      this.logger.warn('Magic-link delivery failed', { event: 'auth.magic_link.requested' });
    }
  }

  async issue(email: string, ttlMs = MAGIC_LINK_TTL_MS): Promise<{ token: string; expiresAt: Date } | null> {
    const invitation = await this.invitationService.findUnrevokedByEmail(email);
    if (!invitation) return null;

    const bytes = randomBytes(32);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + ttlMs);
    await this.loginTokenRepository.create({
      email: invitation.email,
      tokenHash: tokenHash(bytes),
      expiresAt,
      consumedAt: null,
      reusable: false,
    });

    return { token: bytes.toString('base64url'), expiresAt };
  }

  async consume(token: string): Promise<string | null> {
    const bytes = tokenBytes(token);
    if (!bytes) return null;
    return this.loginTokenRepository.consume(tokenHash(bytes), this.clock.now());
  }

  async issueAccountLoginLink(email: string, appUrl: string): Promise<void> {
    const bytes = randomBytes(32);
    const expiresAt = new Date(this.clock.now().getTime() + ACCOUNT_LOGIN_LINK_TTL_MS);
    await this.loginTokenRepository.create({
      email: email.trim().toLowerCase(),
      tokenHash: tokenHash(bytes),
      expiresAt,
      consumedAt: null,
      reusable: true,
    });

    const verificationUrl = new URL('/auth/verify', appUrl);
    verificationUrl.searchParams.set('token', bytes.toString('base64url'));
    verificationUrl.searchParams.set('mode', 'account');
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[account login link] ${verificationUrl.toString()}`);
    }
    try {
      await this.mailer.send({
        to: email.trim().toLowerCase(),
        template: 'account-login-link',
        data: { link: verificationUrl.toString() },
      });
    } catch {
      this.logger.warn('Account login link delivery failed', { event: 'auth.account_login_link.issued' });
    }
  }

  async verifyAccountLoginLink(token: string): Promise<string | null> {
    const bytes = tokenBytes(token);
    if (!bytes) return null;
    return this.loginTokenRepository.findReusable(tokenHash(bytes), this.clock.now());
  }
}
