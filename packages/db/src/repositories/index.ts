// Repository layer for database access
import { getORM } from '../config';
import { User, Article } from '../entities';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const em = getORM().em;
    return em.findOne(User, { id });
  }

  async findByEmail(email: string): Promise<User | null> {
    const em = getORM().em;
    return em.findOne(User, { email });
  }

  async create(data: Partial<User>): Promise<User> {
    const em = getORM().em;
    const user = em.create(User, data);
    await em.persistAndFlush(user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const em = getORM().em;
    const user = await em.findOne(User, { id });
    if (!user) return null;
    Object.assign(user, data);
    await em.persistAndFlush(user);
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const em = getORM().em;
    const user = await em.findOne(User, { id });
    if (!user) return false;
    await em.removeAndFlush(user);
    return true;
  }
}

export class ArticleRepository {
  async findById(id: string): Promise<Article | null> {
    const em = getORM().em;
    return em.findOne(Article, { id });
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    const em = getORM().em;
    return em.find(Article, { authorId });
  }

  async create(data: Partial<Article>): Promise<Article> {
    const em = getORM().em;
    const article = em.create(Article, data);
    await em.persistAndFlush(article);
    return article;
  }
}
