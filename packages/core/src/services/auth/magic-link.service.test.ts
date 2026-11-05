import { createHash } from 'node:crypto';
import { MAGIC_LINK_TTL_MS, MagicLinkService } from './magic-link.service';

const NOW = new Date('2026-11-05T12:00:00.000Z');

describe('MagicLinkService', () => {
  it('stores only a SHA-256 hash of 32 random bytes and returns a 15-minute token', async () => {
    const loginTokenRepository = { create: jest.fn<Promise<void>, [unknown]>(async () => undefined) };
    const invitationService = {
      findUnrevokedByEmail: jest.fn(async () => ({ email: 'ada@example.com' })),
    };
    const service = new MagicLinkService({
      loginTokenRepository: loginTokenRepository as never,
      invitationService: invitationService as never,
      clock: { now: () => NOW },
    });

    const issued = await service.issue(' Ada@Example.COM ');
    expect(issued).not.toBeNull();
    const bytes = Buffer.from(issued!.token, 'base64url');
    expect(bytes).toHaveLength(32);
    expect(issued!.expiresAt).toEqual(new Date(NOW.getTime() + MAGIC_LINK_TTL_MS));
    expect(loginTokenRepository.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      tokenHash: createHash('sha256').update(bytes).digest('hex'),
      expiresAt: issued!.expiresAt,
      consumedAt: null,
    });
    expect(loginTokenRepository.create.mock.calls[0][0]).not.toHaveProperty('token');
  });

  it('does not issue tokens for uninvited or revoked e-mails', async () => {
    const loginTokenRepository = { create: jest.fn() };
    const invitationService = { findUnrevokedByEmail: jest.fn(async () => null) };
    const service = new MagicLinkService({
      loginTokenRepository: loginTokenRepository as never,
      invitationService: invitationService as never,
      clock: { now: () => NOW },
    });

    await expect(service.issue('nobody@example.com')).resolves.toBeNull();
    expect(loginTokenRepository.create).not.toHaveBeenCalled();
  });

  it('rejects malformed or wrong-length tokens without querying persistence', async () => {
    const loginTokenRepository = { consume: jest.fn() };
    const service = new MagicLinkService({
      loginTokenRepository: loginTokenRepository as never,
      invitationService: {} as never,
      clock: { now: () => NOW },
    });

    await expect(service.consume('not-a-token')).resolves.toBeNull();
    expect(loginTokenRepository.consume).not.toHaveBeenCalled();
  });

  it('uses the injected clock when consuming tokens', async () => {
    const loginTokenRepository = { consume: jest.fn(async () => null) };
    const service = new MagicLinkService({
      loginTokenRepository: loginTokenRepository as never,
      invitationService: {} as never,
      clock: { now: () => NOW },
    });
    const token = Buffer.alloc(32, 4).toString('base64url');

    await expect(service.consume(token)).resolves.toBeNull();
    expect(loginTokenRepository.consume).toHaveBeenCalledWith(
      createHash('sha256').update(Buffer.alloc(32, 4)).digest('hex'),
      NOW,
    );
  });
});
