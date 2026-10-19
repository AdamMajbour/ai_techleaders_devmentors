import type { Article, ArticleRepository } from '@devmentor/db';

export class ArticleService {
  private readonly articleRepository: ArticleRepository;

  constructor({ articleRepository }: { articleRepository: ArticleRepository }) {
    this.articleRepository = articleRepository;
  }

  listByAuthor(authorId: string): Promise<Article[]> {
    return this.articleRepository.findByAuthor(authorId);
  }
}
