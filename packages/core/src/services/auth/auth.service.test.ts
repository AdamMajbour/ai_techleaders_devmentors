/** @jest-environment node */
import type { User, UserRepository } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { ConflictError, UnauthorizedError } from '../../http/errors';
import { hashPassword } from '../../security/password';
import type { InvitationDto } from './invitation.service';
import type { Clock } from '../../utils/clock';
import { AuthService } from './auth.service';
import { INVALID_MAGIC_LINK_MESSAGE } from './magic-link.constants';

// The ORM may only be imported by @devmentor/db, so the violation check is stubbed here
// (it is covered against a real database by the db integration tests).
jest.mock('@devmentor/db', () => ({
  ...jest.requireActual('@devmentor/db'),
  isUniqueConstraintViolation: (error: unknown) => error instanceof Error && error.message === 'duplicate key',
}));

const silent = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function setup(repository: Partial<Record<keyof UserRepository, jest.Mock>>) {
  const eventBus = createEventBus(silent);
  const registered = jest.fn();
  eventBus.on('auth.user.registered', registered);
  const invitationService = {
    findUnrevokedByEmail: jest.fn<Promise<InvitationDto | null>, [string]>(async () => null),
    acceptForUser: jest.fn<Promise<boolean>, [string, string, Date]>(async () => true),
  };
  const clock: Clock = { now: () => new Date('2026-11-05T12:00:00.000Z') };
  const mentorService = { recordSignInActivity: jest.fn(async () => undefined) };
  return {
    service: new AuthService({
      userRepository: repository as unknown as UserRepository,
      eventBus,
      invitationService: invitationService as never,
      mentorService: mentorService as never,
      clock,
      logger: silent,
    }),
    registered,
    invitationService,
    mentorService,
  };
}

const userWith = (passwordHash: string | null) =>
  ({ id: 'u1', email: 'ada@example.com', name: 'Ada', createdAt: new Date(), passwordHash }) as unknown as User;

describe('AuthService.register', () => {
  it('stores a bcrypt hash (cost 12) instead of the password, emits an event and returns a DTO', async () => {
    const create = jest.fn(async (data: { passwordHash: string }) => ({ ...userWith(data.passwordHash) }) as User);
    const { service, registered } = setup({ create });

    const dto = await service.register({ email: 'ada@example.com', name: 'Ada', password: 'correct horse battery' });

    const saved = create.mock.calls[0][0] as { passwordHash: string };
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(saved.passwordHash).not.toContain('correct horse');
    expect(registered).toHaveBeenCalledWith({ userId: 'u1' });
    expect(dto).not.toHaveProperty('passwordHash');
  }, 20_000);

  it('maps a unique-constraint violation to a generic ConflictError', async () => {
    const violation = new Error('duplicate key');
    const { service } = setup({ create: jest.fn(async () => Promise.reject(violation)) });

    const attempt = service.register({ email: 'ada@example.com', name: 'Ada', password: 'correct horse battery' });
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    await expect(attempt).rejects.toThrow('Registration could not be completed.');
  }, 20_000);

  it('rethrows any other failure', async () => {
    const { service } = setup({ create: jest.fn(async () => Promise.reject(new Error('db down'))) });
    await expect(service.register({ email: 'a@b.co', name: 'A', password: 'correct horse battery' })).rejects.toThrow('db down');
  }, 20_000);
});

describe('AuthService.login', () => {
  it('returns the user for the right password', async () => {
    const hash = await hashPassword('correct horse battery');
    const { service, mentorService } = setup({ findByEmail: jest.fn(async () => userWith(hash)) });

    expect((await service.login({ email: 'ada@example.com', password: 'correct horse battery' })).id).toBe('u1');
    expect(mentorService.recordSignInActivity).toHaveBeenCalledWith('u1');
  }, 20_000);

  it('gives the identical error for a wrong password, an unknown e-mail and an account without a password', async () => {
    const hash = await hashPassword('correct horse battery');
    const cases = [
      setup({ findByEmail: jest.fn(async () => userWith(hash)) }), // wrong password
      setup({ findByEmail: jest.fn(async () => null) }), // unknown e-mail
      setup({ findByEmail: jest.fn(async () => userWith(null)) }), // no password set
    ];

    const errors = await Promise.all(
      cases.map(({ service }) => service.login({ email: 'ada@example.com', password: 'wrong password!!' }).catch((e: Error) => e)),
    );

    for (const error of errors) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as Error).message).toBe('Invalid credentials.');
    }
  }, 30_000);
});

describe('AuthService.signInWithMagicLink', () => {
  const invitation: InvitationDto = {
    id: 'invitation-1',
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    role: 'mentor',
    invitedBy: null,
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
  };

  it('creates a first-time invited user, copies the invitation name and accepts it', async () => {
    const createdUser = { ...userWith(null), name: 'Ada Lovelace' };
    const create = jest.fn(async () => createdUser);
    const { service, registered, invitationService } = setup({
      findByEmail: jest.fn(async () => null),
      create,
    });
    invitationService.findUnrevokedByEmail.mockResolvedValue(invitation);

    await expect(service.signInWithMagicLink('ada@example.com')).resolves.toMatchObject({
      id: 'u1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    });

    expect(create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      passwordHash: null,
    });
    expect(invitationService.acceptForUser).toHaveBeenCalledWith(
      'ada@example.com',
      'u1',
      new Date('2026-11-05T12:00:00.000Z'),
    );
    expect(registered).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('signs in an existing invited user without creating a duplicate account', async () => {
    const existing = userWith(null);
    const create = jest.fn();
    const { service, registered, invitationService, mentorService } = setup({
      findByEmail: jest.fn(async () => existing),
      create,
    });
    invitationService.findUnrevokedByEmail.mockResolvedValue({
      ...invitation,
      acceptedByUserId: 'u1',
      acceptedAt: new Date('2026-10-30T12:00:00.000Z'),
    });

    await expect(service.signInWithMagicLink('ada@example.com')).resolves.toMatchObject({ id: 'u1' });
    expect(create).not.toHaveBeenCalled();
    expect(invitationService.acceptForUser).toHaveBeenCalledWith(
      'ada@example.com',
      'u1',
      new Date('2026-11-05T12:00:00.000Z'),
    );
    expect(registered).not.toHaveBeenCalled();
    expect(mentorService.recordSignInActivity).toHaveBeenCalledWith('u1');
  });

  it('does not fail sign-in if mentor activity cannot be recorded', async () => {
    const hash = await hashPassword('correct horse battery');
    const { service, mentorService } = setup({ findByEmail: jest.fn(async () => userWith(hash)) });
    mentorService.recordSignInActivity.mockRejectedValue(new Error('activity storage unavailable'));

    await expect(service.login({ email: 'ada@example.com', password: 'correct horse battery' }))
      .resolves.toMatchObject({ id: 'u1' });
    expect(silent.warn).toHaveBeenCalledWith(
      'Could not update mentor activity after sign-in.',
      expect.objectContaining({ userId: 'u1' }),
    );
  }, 20_000);

  it('rejects a revoked invitation and an invitation that cannot be accepted', async () => {
    const { service, invitationService } = setup({
      findByEmail: jest.fn(async () => null),
      create: jest.fn(async () => userWith(null)),
    });

    await expect(service.signInWithMagicLink('ada@example.com')).rejects.toMatchObject({
      name: 'UnauthorizedError',
      message: INVALID_MAGIC_LINK_MESSAGE,
    });

    invitationService.findUnrevokedByEmail.mockResolvedValue(invitation);
    invitationService.acceptForUser.mockResolvedValue(false);
    await expect(service.signInWithMagicLink('ada@example.com')).rejects.toMatchObject({
      name: 'UnauthorizedError',
      message: INVALID_MAGIC_LINK_MESSAGE,
    });
  });
});
