import type { EntityManager, ArticleRepository, UserRepository, ApprovalRequestRepository } from '@devmentor/db';
import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logger';
import type { ArticleService } from '../services/articles/article.service';
import type { AuthService } from '../services/auth/auth.service';
import type { UserService } from '../services/auth/user.service';
import type { PaymentGateway } from '../services/payments/payment-gateway.port';
import type { Mailer } from '../services/notifications/mailer.port';
import type { Clock } from '../utils/clock';
import type { ApprovalService, ApproverResolvers } from '../services/approvals/approval.service';

/** Every dependency the container can provide. A new service is one line here and one in container.ts. */
export interface Cradle {
  logger: Logger;
  clock: Clock;
  eventBus: EventBus;
  orm: OrmLike;
  em: EntityManager;
  userRepository: UserRepository;
  articleRepository: ArticleRepository;
  approvalRequestRepository: ApprovalRequestRepository;
  userService: UserService;
  authService: AuthService;
  articleService: ArticleService;
  approvalService: ApprovalService;
  approverResolvers: ApproverResolvers;
  paymentGateway: PaymentGateway;
  mailer: Mailer;
}

/** The part of the ORM the container needs (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}
