import type { ArticleRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { assertOwns } from '../../http/auth';
import { NotFoundError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { ArticleCreateInput } from '../../validators/articles/article-create.schema';
import type { ArticleListQuery } from '../../validators/articles/article-list.schema';
import type { ArticleUpdateInput } from '../../validators/articles/article-update.schema';
import { toArticleDto, type ArticleDto, type Page } from '../dto';

type Dependencies = { articleRepository: ArticleRepository; eventBus: EventBus };

export class ArticleService {
  private readonly articleRepository: ArticleRepository;
  private readonly eventBus: EventBus;

  constructor({ articleRepository, eventBus }: Dependencies) {
    this.articleRepository = articleRepository;
    this.eventBus = eventBus;
  }

  async list({ authorId, page, pageSize }: ArticleListQuery): Promise<Page<ArticleDto>> {
    const { items, total } = await this.articleRepository.findPage({
      authorId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { items: items.map(toArticleDto), page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async get(id: string): Promise<ArticleDto> {
    return toArticleDto(await this.find(id));
  }

  /** The author is the session user, whatever the client sent. */
  async create(session: Session, input: ArticleCreateInput): Promise<ArticleDto> {
    const article = await this.articleRepository.create({ ...input, authorId: session.userId });
    await this.eventBus.emit('articles.article.created', { articleId: article.id, authorId: article.authorId });
    return toArticleDto(article);
  }

  async update(session: Session, id: string, input: ArticleUpdateInput): Promise<ArticleDto> {
    const existing = await this.find(id);
    assertOwns(session, existing.authorId);

    const updated = await this.articleRepository.update(id, input);
    if (!updated) throw new NotFoundError('Article not found.');
    await this.eventBus.emit('articles.article.updated', { articleId: id, authorId: updated.authorId });
    return toArticleDto(updated);
  }

  async remove(session: Session, id: string): Promise<{ id: string }> {
    const existing = await this.find(id);
    assertOwns(session, existing.authorId);

    await this.articleRepository.delete(id);
    await this.eventBus.emit('articles.article.deleted', { articleId: id, authorId: existing.authorId });
    return { id };
  }

  private async find(id: string) {
    const article = await this.articleRepository.findById(id);
    if (!article) throw new NotFoundError('Article not found.');
    return article;
  }
}
