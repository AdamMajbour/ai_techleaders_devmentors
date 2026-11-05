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
import { registerBookingMailMappings } from '../events/booking-mail';
import { createLogger, type Logger } from '../logger';
import { getBookingSettings } from '../config/env';
import { ArticleService } from '../services/articles/article.service';
import { AuthService } from '../services/auth/auth.service';
import { UserService } from '../services/auth/user.service';
import { InvitationService } from '../services/auth/invitation.service';
import { MagicLinkService } from '../services/auth/magic-link.service';
import { createConfiguredPaymentGateway } from '../services/payments/payment-gateway.factory';
import { PaymentService } from '../services/payments/payment.service';
import { ConfiguredMailer } from '../services/notifications/adapters/configured-mailer';
import { ApprovalService, defaultApproverResolvers } from '../services/approvals/approval.service';
import { MentorService } from '../services/mentors/mentor.service';
import { BookingService } from '../services/bookings/booking.service';
import { RefundService } from '../services/refunds/refund.service';
import { systemClock } from '../utils/clock';
import type { Cradle, OrmLike } from './cradle';

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(orm: OrmLike, logger: Logger = createLogger()): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  const eventBus = createEventBus(logger);
  registerLoggingSubscriber(eventBus, logger);
  const mailer = new ConfiguredMailer();
  registerMailSubscriber(eventBus, mailer, logger, (onMail) => {
    registerBookingMailMappings(onMail, {
      paidQuestion: (bookingId) => withScope(async ({ bookingRepository, userRepository }) => {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking || booking.status !== 'paid') return null;
        const mentor = await userRepository.findById(booking.mentorId);
        if (!mentor) return null;
        return { to: mentor.email, question: booking.question };
      }),
      acceptedBooking: (bookingId) => withScope(async ({ bookingRepository, userRepository }) => {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking || booking.status !== 'accepted' || !booking.startsAt) return null;
        const [seeker, mentor] = await Promise.all([
          userRepository.findById(booking.seekerId),
          userRepository.findById(booking.mentorId),
        ]);
        if (!seeker || !mentor) return null;
        return { to: seeker.email, mentorName: mentor.name, startsAt: booking.startsAt.toISOString() };
      }),
    });
  });

  container.register({
    logger: asValue(logger),
    clock: asValue(systemClock),
    bookingSettings: asValue(getBookingSettings),
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
    refundService: asClass(RefundService).scoped(),
    paymentService: asClass(PaymentService).scoped(),
    invitationService: asClass(InvitationService).scoped(),
    magicLinkService: asClass(MagicLinkService).scoped(),
    approverResolvers: asValue(defaultApproverResolvers),
    paymentGateway: asFunction(createConfiguredPaymentGateway).singleton(),
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
