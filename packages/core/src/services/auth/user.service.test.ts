/** @jest-environment node */
import type { User, UserRepository } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';
import { UserService } from './user.service';

const ada = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada',
  avatar: undefined,
  passwordHash: '$2b$12$secret',
  createdAt: new Date('2026-01-02T03:04:05Z'),
} as unknown as User;

function service(found: User | null) {
  const userRepository = {
    findById: jest.fn(async () => found),
    findPage: jest.fn(async () => ({ items: found ? [found] : [], total: found ? 1 : 0 })),
  } as unknown as UserRepository;
  return new UserService({ userRepository });
}

describe('UserService', () => {
  it('returns a DTO without the password hash', async () => {
    const dto = await service(ada).getById('u1');

    expect(dto).toEqual({ id: 'u1', email: 'ada@example.com', name: 'Ada', avatar: null, createdAt: '2026-01-02T03:04:05.000Z' });
    expect(JSON.stringify(dto)).not.toContain('secret');
  });

  it('throws NotFoundError (not null) for an unknown user', async () => {
    await expect(service(null).getById('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns one page of operator users and calculates its metadata', async () => {
    const result = await service(ada).listForOperator({ page: 2, pageSize: 10 });

    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1, pageCount: 1, items: [{ id: 'u1' }] });
  });
});
