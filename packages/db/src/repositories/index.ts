// Repository layer for database access.
// Repositories receive an EntityManager instead of reaching for the global one:
// MikroORM forbids using the global EM for context-specific work, so callers pass
// a fork (`orm.em.fork()`) per request / script / test.
import type { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { User, Article } from '../entities';

/** `passwordHash` is hidden from serialization, which makes the type system require it; here it is optional. */
export type NewUser = Omit<RequiredEntityData<User>, 'passwordHash'> & { passwordHash?: string | null };

export class UserRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<User | null> {
    return this.em.findOne(User, { id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email });
  }

  async create(data: NewUser): Promise<User> {
    const user = this.em.create(User, data as RequiredEntityData<User>);
    this.em.persist(user);
    await this.em.flush();
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User | null> {
    const user = await this.em.findOne(User, { id });
    if (!user) return null;
    Object.assign(user, data);
    await this.em.flush();
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.em.findOne(User, { id });
    if (!user) return false;
    this.em.remove(user);
    await this.em.flush();
    return true;
  }
}

export type ArticlePage = { items: Article[]; total: number };

export class ArticleRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Article | null> {
    return this.em.findOne(Article, { id });
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    return this.em.find(Article, { authorId });
  }

  /** Newest first. `authorId` narrows the list; without it every article is returned. */
  async findPage(options: { authorId?: string; limit: number; offset: number }): Promise<ArticlePage> {
    const { authorId, limit, offset } = options;
    const [items, total] = await this.em.findAndCount(
      Article,
      authorId ? { authorId } : {},
      { orderBy: { createdAt: 'desc', id: 'asc' }, limit, offset },
    );
    return { items, total };
  }

  async create(data: RequiredEntityData<Article>): Promise<Article> {
    const article = this.em.create(Article, data);
    this.em.persist(article);
    await this.em.flush();
    return article;
  }

  async update(id: string, data: { title?: string; content?: string }): Promise<Article | null> {
    const article = await this.em.findOne(Article, { id });
    if (!article) return null;
    Object.assign(article, data);
    await this.em.flush();
    return article;
  }

  async delete(id: string): Promise<boolean> {
    const article = await this.em.findOne(Article, { id });
    if (!article) return false;
    this.em.remove(article);
    await this.em.flush();
    return true;
  }
}
