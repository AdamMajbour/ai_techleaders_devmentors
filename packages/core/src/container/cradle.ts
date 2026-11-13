import type { EntityManager, ArticleRepository, SessionNoteRepository, UserRepository } from '@devmentor/db';
import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logger';
import type { ArticleService } from '../services/articles/article.service';
import type { AuthService } from '../services/auth/auth.service';
import type { SessionNoteService } from '../services/notes/session-note.service';
import type { UserService } from '../services/auth/user.service';

/** Every dependency the container can provide. A new service is one line here and one in container.ts. */
export interface Cradle {
  logger: Logger;
  eventBus: EventBus;
  orm: OrmLike;
  em: EntityManager;
  userRepository: UserRepository;
  articleRepository: ArticleRepository;
  sessionNoteRepository: SessionNoteRepository;
  userService: UserService;
  authService: AuthService;
  articleService: ArticleService;
  sessionNoteService: SessionNoteService;
}

/** The part of the ORM the container needs (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}
