/** @jest-environment node */
import type { User, UserRepository } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';
import { UserService } from './user.service';

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada' } as User;

function service(overrides: Partial<UserRepository> = {}) {
  const userRepository = {
    findById: jest.fn(async (id: string) => (id === ada.id ? ada : null)),
    findByEmail: jest.fn(async (email: string) => (email === ada.email ? ada : null)),
    ...overrides,
  } as unknown as UserRepository;
  return new UserService({ userRepository });
}

describe('UserService', () => {
  it('returns a user by id and by e-mail', async () => {
    expect(await service().getById('u1')).toBe(ada);
    expect(await service().getByEmail('ada@example.com')).toBe(ada);
  });

  it('throws NotFoundError (not null) for an unknown user', async () => {
    await expect(service().getById('nope')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service().getByEmail('nope@example.com')).rejects.toBeInstanceOf(NotFoundError);
  });
});
