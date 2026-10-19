/** @jest-environment node */
import type { Article, ArticleRepository } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { ForbiddenError, NotFoundError } from '../../http/errors';
import { ArticleService } from './article.service';

const silent = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const ME = { userId: 'me' };

const stored = (overrides: Partial<Article> = {}) =>
  ({
    id: 'a1',
    title: 'Title',
    content: 'Body',
    authorId: 'me',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as Article;

function setup(repository: Partial<Record<keyof ArticleRepository, jest.Mock>> = {}) {
  const eventBus = createEventBus(silent);
  const emitted: string[] = [];
  for (const name of ['articles.article.created', 'articles.article.updated', 'articles.article.deleted'] as const) {
    eventBus.on(name, () => void emitted.push(name));
  }
  const articleRepository = repository as unknown as ArticleRepository;
  return { service: new ArticleService({ articleRepository, eventBus }), emitted };
}

describe('ArticleService', () => {
  it('lists a page of DTOs with paging metadata and converts page to an offset', async () => {
    const findPage = jest.fn(async () => ({ items: [stored()], total: 23 }));
    const { service } = setup({ findPage });

    const page = await service.list({ page: 3, pageSize: 10 });

    expect(findPage).toHaveBeenCalledWith({ authorId: undefined, limit: 10, offset: 20 });
    expect(page).toMatchObject({ page: 3, pageSize: 10, total: 23, pageCount: 3 });
    expect(page.items[0]).toMatchObject({ id: 'a1', createdAt: '2026-01-01T00:00:00.000Z' });
  });

  it('reports one page for an empty list', async () => {
    const { service } = setup({ findPage: jest.fn(async () => ({ items: [], total: 0 })) });
    expect((await service.list({ page: 1, pageSize: 10 })).pageCount).toBe(1);
  });

  it('creates with the session user as author, ignoring any author in the input, and emits an event', async () => {
    const create = jest.fn(async (data: Partial<Article>) => stored({ ...data }));
    const { service, emitted } = setup({ create });

    const dto = await service.create(ME, { title: 'T', content: 'C', authorId: 'someone-else' } as never);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'me' }));
    expect(dto.authorId).toBe('me');
    expect(emitted).toEqual(['articles.article.created']);
  });

  it("lets the owner update, and refuses somebody else's article without touching it", async () => {
    const update = jest.fn(async () => stored({ title: 'New' }));
    const { service, emitted } = setup({ findById: jest.fn(async () => stored()), update });

    expect((await service.update(ME, 'a1', { title: 'New' })).title).toBe('New');
    expect(emitted).toEqual(['articles.article.updated']);

    const other = setup({ findById: jest.fn(async () => stored({ authorId: 'other' })), update: jest.fn() });
    await expect(other.service.update(ME, 'a1', { title: 'Hijack' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(other.emitted).toEqual([]);
  });

  it("lets the owner delete, and refuses somebody else's article", async () => {
    const del = jest.fn(async () => true);
    const { service, emitted } = setup({ findById: jest.fn(async () => stored()), delete: del });
    expect(await service.remove(ME, 'a1')).toEqual({ id: 'a1' });
    expect(emitted).toEqual(['articles.article.deleted']);

    const deleteOther = jest.fn();
    const other = setup({ findById: jest.fn(async () => stored({ authorId: 'other' })), delete: deleteOther });
    await expect(other.service.remove(ME, 'a1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(deleteOther).not.toHaveBeenCalled();
  });

  it('answers NotFoundError for a missing article on get, update and remove', async () => {
    const { service } = setup({ findById: jest.fn(async () => null) });

    await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.update(ME, 'x', { title: 'T' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(ME, 'x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
