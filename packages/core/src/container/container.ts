// Dependency injection (Awilix). Every binding is registered by hand, never auto-discovered,
// so each one can be found with grep.
//
//   logger, eventBus, orm                      - singletons (one connection pool per process)
//   em, repositories, services                 - scoped: a fresh EntityManager fork per scope
import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import {
  ApprovalRequestRepository,
  ArticleRepository,
  BookingRepository,
  initializeORM,
  InvitationRepository,
  LoginTokenRepository,
  MentorProfileRepository,
  PaymentRepository,
  UserRepository,
} from '@devmentor/db';
import { createEventBus } from '../events/event-bus';
import { registerLoggingSubscriber } from '../events/logging-subscriber';
import { registerMailSubscriber } from '../events/mail-subscriber';
import { createLogger, type Logger } from '../logger';
import { ArticleService } from '../services/articles/article.service';
import { AuthService } from '../services/auth/auth.service';
import { UserService } from '../services/auth/user.service';
import { InvitationService } from '../services/auth/invitation.service';
import { MagicLinkService } from '../services/auth/magic-link.service';
import { MockPaymentGateway } from '../services/payments/adapters/mock-payment-gateway';
import { PaymentService } from '../services/payments/payment.service';
import { ConfiguredMailer } from '../services/notifications/adapters/configured-mailer';
import { ApprovalService, defaultApproverResolvers } from '../services/approvals/approval.service';
import { MentorService } from '../services/mentors/mentor.service';
import { BookingService } from '../services/bookings/booking.service';
import { systemClock } from '../utils/clock';
import type { Cradle, OrmLike } from './cradle';

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(orm: OrmLike, logger: Logger = createLogger()): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  const eventBus = createEventBus(logger);
  registerLoggingSubscriber(eventBus, logger);
  const mailer = new ConfiguredMailer();
  registerMailSubscriber(eventBus, mailer, logger);

  container.register({
    logger: asValue(logger),
    clock: asValue(systemClock),
    eventBus: asValue(eventBus),
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userRepository: asFunction(({ em }: Cradle) => new UserRepository(em)).scoped(),
    articleRepository: asFunction(({ em }: Cradle) => new ArticleRepository(em)).scoped(),
    approvalRequestRepository: asFunction(({ em }: Cradle) => new ApprovalRequestRepository(em)).scoped(),
    invitationRepository: asFunction(({ em }: Cradle) => new InvitationRepository(em)).scoped(),
    loginTokenRepository: asFunction(({ em }: Cradle) => new LoginTokenRepository(em)).scoped(),
    mentorProfileRepository: asFunction(({ em }: Cradle) => new MentorProfileRepository(em)).scoped(),
    bookingRepository: asFunction(({ em }: Cradle) => new BookingRepository(em)).scoped(),
    paymentRepository: asFunction(({ em }: Cradle) => new PaymentRepository(em)).scoped(),
    userService: asClass(UserService).scoped(),
    authService: asClass(AuthService).scoped(),
    articleService: asClass(ArticleService).scoped(),
    approvalService: asClass(ApprovalService).scoped(),
    mentorService: asClass(MentorService).scoped(),
    bookingService: asClass(BookingService).scoped(),
    paymentService: asClass(PaymentService).scoped(),
    invitationService: asClass(InvitationService).scoped(),
    magicLinkService: asClass(MagicLinkService).scoped(),
    approverResolvers: asValue(defaultApproverResolvers),
    paymentGateway: asValue(new MockPaymentGateway()),
    mailer: asValue(mailer),
  });

  return container;
}

let rootContainer: Promise<AppContainer> | null = null;

/** Root container, created once per process (the ORM connects on first use). */
export function getContainer(): Promise<AppContainer> {
  rootContainer ??= initializeORM()
    .then((orm) => buildContainer(orm))
    .catch((error: unknown) => {
      rootContainer = null; // let the next request retry instead of caching the failure
      throw error;
    });
  return rootContainer;
}

/** Runs `fn` in a new scope: everything it resolves shares one EntityManager fork. */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope();
  return fn(scope.cradle);
}
