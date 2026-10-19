/** @jest-environment node */
import type { User, UserRepository } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { ConflictError, UnauthorizedError } from '../../http/errors';
import { hashPassword } from '../../security/password';
import { AuthService } from './auth.service';

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
  return { service: new AuthService({ userRepository: repository as unknown as UserRepository, eventBus }), registered };
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
    const { service } = setup({ findByEmail: jest.fn(async () => userWith(hash)) });

    expect((await service.login({ email: 'ada@example.com', password: 'correct horse battery' })).id).toBe('u1');
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
