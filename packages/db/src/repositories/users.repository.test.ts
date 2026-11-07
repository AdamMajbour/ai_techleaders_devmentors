import type { EntityManager } from '@mikro-orm/core';
import { User } from '../entities';
import { UserRepository } from './index';

describe('UserRepository.findPage', () => {
  it('uses a bounded query and returns the database total', async () => {
    const items = [{ id: 'user-26' }] as User[];
    const findAndCount = jest.fn(async () => [items, 57] as [User[], number]);
    const repository = new UserRepository({ findAndCount } as unknown as EntityManager);

    await expect(repository.findPage({ limit: 25, offset: 25 })).resolves.toEqual({ items, total: 57 });
    expect(findAndCount).toHaveBeenCalledWith(User, {}, {
      orderBy: { createdAt: 'desc', id: 'asc' },
      limit: 25,
      offset: 25,
    });
  });
});
