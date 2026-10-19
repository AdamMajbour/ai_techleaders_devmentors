import type { EntityManager, ArticleRepository, UserRepository } from '@devmentor/db';
import type { Logger } from '../logger';
import type { ArticleService } from '../services/articles/article.service';
import type { UserService } from '../services/auth/user.service';

/** Every dependency the container can provide. A new service is one line here and one in container.ts. */
export interface Cradle {
  logger: Logger;
  orm: OrmLike;
  em: EntityManager;
  userRepository: UserRepository;
  articleRepository: ArticleRepository;
  userService: UserService;
  articleService: ArticleService;
}

/** The part of the ORM the container needs (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}
