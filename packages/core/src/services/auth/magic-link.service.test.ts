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
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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
      reusable: false,
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
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    const token = Buffer.alloc(32, 4).toString('base64url');

    await expect(service.consume(token)).resolves.toBeNull();
    expect(loginTokenRepository.consume).toHaveBeenCalledWith(
      createHash('sha256').update(Buffer.alloc(32, 4)).digest('hex'),
      NOW,
    );
  });

  it('sends an invited address a link through the configured mailer', async () => {
    const mailer = { send: jest.fn(async () => undefined) };
    const service = new MagicLinkService({
      loginTokenRepository: { create: jest.fn(async () => undefined) } as never,
      invitationService: {
        findUnrevokedByEmail: jest.fn(async () => ({ email: 'ada@example.com' })),
      } as never,
      clock: { now: () => NOW },
      mailer,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });

    await service.request(' Ada@Example.COM ', 'https://devmentor.example');

    expect(mailer.send).toHaveBeenCalledWith({
      to: 'ada@example.com',
      template: 'magic-link',
      data: { url: expect.stringMatching(/^https:\/\/devmentor\.example\/auth\/verify\?token=[A-Za-z0-9_-]{43}$/) },
    });
  });

  it('does not send mail for an uninvited address and absorbs mail transport failures', async () => {
    const mailer = { send: jest.fn(async () => Promise.reject(new Error('transport unavailable'))) };
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const invitationService = {
      findUnrevokedByEmail: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'ada@example.com' }),
    };
    const service = new MagicLinkService({
      loginTokenRepository: { create: jest.fn(async () => undefined) } as never,
      invitationService: invitationService as never,
      clock: { now: () => NOW },
      mailer,
      logger,
    });

    await expect(service.request('nobody@example.com', 'https://devmentor.example')).resolves.toBeUndefined();
    expect(mailer.send).not.toHaveBeenCalled();
    await expect(service.request('ada@example.com', 'https://devmentor.example')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith('Magic-link delivery failed', {
      event: 'auth.magic_link.requested',
    });
  });

  it('returns null for expired tokens and for a previously consumed token', async () => {
    const expiredRepository = { consume: jest.fn(async () => null) };
    const expiredService = new MagicLinkService({
      loginTokenRepository: expiredRepository as never,
      invitationService: {} as never,
      clock: { now: () => NOW },
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    const token = Buffer.alloc(32, 4).toString('base64url');

    await expect(expiredService.consume(token)).resolves.toBeNull();
    expect(expiredRepository.consume).toHaveBeenCalledTimes(1);

    const consumedRepository = {
      consume: jest.fn().mockResolvedValueOnce('ada@example.com').mockResolvedValueOnce(null),
    };
    const consumedService = new MagicLinkService({
      loginTokenRepository: consumedRepository as never,
      invitationService: {} as never,
      clock: { now: () => NOW },
      mailer: { send: jest.fn(async () => undefined) },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });

    await expect(consumedService.consume(token)).resolves.toBe('ada@example.com');
    await expect(consumedService.consume(token)).resolves.toBeNull();
    expect(consumedRepository.consume).toHaveBeenCalledTimes(2);
  });
});
