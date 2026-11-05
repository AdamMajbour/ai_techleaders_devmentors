import { createHash, randomBytes } from 'node:crypto';
import type { LoginTokenRepository } from '@devmentor/db';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from './invitation.service';

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

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

  constructor({
    loginTokenRepository,
    invitationService,
    clock,
  }: {
    loginTokenRepository: LoginTokenRepository;
    invitationService: InvitationService;
    clock: Clock;
  }) {
    this.loginTokenRepository = loginTokenRepository;
    this.invitationService = invitationService;
    this.clock = clock;
  }

  async issue(email: string): Promise<{ token: string; expiresAt: Date } | null> {
    const invitation = await this.invitationService.findUnrevokedByEmail(email);
    if (!invitation) return null;

    const bytes = randomBytes(32);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MS);
    await this.loginTokenRepository.create({
      email: invitation.email,
      tokenHash: tokenHash(bytes),
      expiresAt,
      consumedAt: null,
    });

    return { token: bytes.toString('base64url'), expiresAt };
  }

  async consume(token: string): Promise<string | null> {
    const bytes = tokenBytes(token);
    if (!bytes) return null;
    return this.loginTokenRepository.consume(tokenHash(bytes), this.clock.now());
  }
}
