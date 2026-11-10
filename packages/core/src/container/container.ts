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
  MessageRepository,
  NoteRepository,
  AvailabilitySlotRepository,
  LedgerEntryRepository,
  MikroOrmUnitOfWork,
  VaultAnswerRepository,
  UserRepository,
} from '@devmentor/db';
import { createEventBus } from '../events/event-bus';
import { registerLoggingSubscriber } from '../events/logging-subscriber';
import { registerMailSubscriber } from '../events/mail-subscriber';
import { registerBookingMailMappings } from '../events/booking-mail';
import { createLogger, type Logger } from '../logger';
import { getBookingSettings, getVaultSettings } from '../config/env';
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
import { AvailabilityService } from '../services/bookings/availability.service';
import { RefundService } from '../services/refunds/refund.service';
import { MessageService } from '../services/messages/message.service';
import { NoteService } from '../services/notes/note.service';
import { systemClock } from '../utils/clock';
import { LedgerService } from '../services/ledger/ledger.service';
import { createConfiguredAnswerGenerator } from '../services/ai/answer-generator.factory';
import { NoteSelector } from '../services/vault/note-selector';
import { VaultAnswerPaymentHandler } from '../services/vault/vault-answer-payment.handler';
import { VaultAnswerService } from '../services/vault/vault-answer.service';
import { VaultReleaseService } from '../services/vault/vault-release.service';
import { VaultGenerationTask } from '../services/vault/vault-generation.task';
import { VaultReviewService } from '../services/vault/vault-review.service';
import { VaultExpireReviewsTask } from '../services/vault/vault-expire-reviews.task';
import { assertConfiguredAIReadyToCharge } from '../services/ai/answer-generator.factory';
import type { Cradle, OrmLike } from './cradle';

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(orm: OrmLike, logger: Logger = createLogger()): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  const eventBus = createEventBus(logger);
  registerLoggingSubscriber(eventBus, logger);
  // Use a write function that flushes immediately to avoid buffering issues
  const mailer = new ConfiguredMailer(undefined, (output) => {
    process.stdout.write(output + '\n');
  });
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
    vaultSettings: asValue(getVaultSettings),
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
    messageRepository: asFunction(({ em }: Cradle) => new MessageRepository(em)).scoped(),
    noteRepository: asFunction(({ em }: Cradle) => new NoteRepository(em)).scoped(),
    availabilitySlotRepository: asFunction(({ em }: Cradle) => new AvailabilitySlotRepository(em)).scoped(),
    ledgerEntryRepository: asFunction(({ em }: Cradle) => new LedgerEntryRepository(em)).scoped(),
    unitOfWork: asFunction(({ em }: Cradle) => new MikroOrmUnitOfWork(em)).scoped(),
    vaultAnswerRepository: asFunction(({ em }: Cradle) => new VaultAnswerRepository(em)).scoped(),
    userService: asClass(UserService).scoped(),
    authService: asClass(AuthService).scoped(),
    articleService: asClass(ArticleService).scoped(),
    approvalService: asClass(ApprovalService).scoped(),
    mentorService: asClass(MentorService).scoped(),
    bookingService: asClass(BookingService).scoped(),
    availabilityService: asClass(AvailabilityService).scoped(),
    ledgerService: asClass(LedgerService).scoped(),
    answerGenerator: asFunction(createConfiguredAnswerGenerator).singleton(),
    noteSelector: asClass(NoteSelector).scoped(),
    vaultAnswerPaymentHandler: asClass(VaultAnswerPaymentHandler).scoped(),
    paymentSubjectHandlers: asFunction(({ vaultAnswerPaymentHandler }: Cradle) => [vaultAnswerPaymentHandler]).scoped(),
    vaultAnswerService: asClass(VaultAnswerService).scoped(),
    vaultReleaseService: asClass(VaultReleaseService).scoped(),
    vaultGenerationTask: asClass(VaultGenerationTask).scoped(),
    vaultReviewService: asClass(VaultReviewService).scoped(),
    vaultExpireReviewsTask: asClass(VaultExpireReviewsTask).scoped(),
    assertAIReady: asValue(assertConfiguredAIReadyToCharge),
    refundService: asClass(RefundService).scoped(),
    messageService: asClass(MessageService).scoped(),
    noteService: asClass(NoteService).scoped(),
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
