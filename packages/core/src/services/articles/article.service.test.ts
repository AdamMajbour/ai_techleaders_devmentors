/** @jest-environment node */
import type { Article, ArticleRepository } from '@devmentor/db';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  it("lists one author's articles through the repository", async () => {
    const articles = [{ id: 'a1', title: 'One' }] as Article[];
    const findByAuthor = jest.fn(async () => articles);
    const service = new ArticleService({ articleRepository: { findByAuthor } as unknown as ArticleRepository });

    expect(await service.listByAuthor('author-1')).toBe(articles);
    expect(findByAuthor).toHaveBeenCalledWith('author-1');
  });
});
