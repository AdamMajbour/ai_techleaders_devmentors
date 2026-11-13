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
  TermsRepository,
  RetentionRepository,
  PilotMetricsRepository,
  ConnectPayoutRepository,
  SessionNoteRepository,
} from '@devmentor/db';
import { createEventBus } from '../events/event-bus';
import { registerLoggingSubscriber } from '../events/logging-subscriber';
import { registerMailSubscriber } from '../events/mail-subscriber';
import { registerBookingMailMappings } from '../events/booking-mail';
import { createLogger, type Logger } from '../logger';
import { getBookingSettings, getPaymentSettings, getVaultSettings } from '../config/env';
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
import { TermsService } from '../services/terms/terms.service';
import { RetentionSweepTask } from '../services/terms/retention-sweep.task';
import { RetentionService } from '../services/terms/retention.service';
import { StripeConnectGateway } from '../services/payouts/stripe-connect-gateway';
import { ConnectPayoutService } from '../services/payouts/connect-payout.service';
import { SessionNoteService } from '../services/notes/session-note.service';
import { PilotMetricsService } from '../services/terms/pilot-metrics.service';
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
    termsRepository: asFunction(({ em }: Cradle) => new TermsRepository(em)).scoped(),
    retentionRepository: asFunction(({ em }: Cradle) => new RetentionRepository(em)).scoped(),
    pilotMetricsRepository: asFunction(({ em }: Cradle) => new PilotMetricsRepository(em)).scoped(),
    connectPayoutRepository: asFunction(({ em }: Cradle) => new ConnectPayoutRepository(em)).scoped(),
    sessionNoteRepository: asFunction(({ em }: Cradle) => new SessionNoteRepository(em)).scoped(),
    userService: asClass(UserService).scoped(),
    authService: asClass(AuthService).scoped(),
    articleService: asClass(ArticleService).scoped(),
    approvalService: asClass(ApprovalService).scoped(),
    mentorService: asClass(MentorService).scoped(),
    bookingService: asFunction((cradle: Cradle) => new BookingService({
      bookingRepository: cradle.bookingRepository,
      availabilitySlotRepository: cradle.availabilitySlotRepository,
      mentorProfileRepository: cradle.mentorProfileRepository,
      paymentRepository: cradle.paymentRepository,
      userRepository: cradle.userRepository,
      invitationService: cradle.invitationService,
      paymentGateway: cradle.paymentGateway,
      paymentService: cradle.paymentService,
      eventBus: cradle.eventBus,
      clock: cradle.clock,
      approvalService: cradle.approvalService,
      approvalRequestRepository: cradle.approvalRequestRepository,
      refundService: cradle.refundService,
      bookingSettings: cradle.bookingSettings,
      termsService: cradle.termsService,
    })).scoped(),
    availabilityService: asClass(AvailabilityService).scoped(),
    ledgerService: asClass(LedgerService).scoped(),
    answerGenerator: asFunction(() => createConfiguredAnswerGenerator()).singleton(),
    noteSelector: asFunction(({ noteRepository, userRepository, logger }: Cradle) => new NoteSelector({ noteRepository, userRepository, logger })).scoped(),
    vaultAnswerPaymentHandler: asFunction(({ vaultAnswerRepository, eventBus, clock }: Cradle) => new VaultAnswerPaymentHandler({ vaultAnswerRepository, eventBus, clock })).scoped(),
    paymentSubjectHandlers: asFunction(({ vaultAnswerPaymentHandler }: Cradle) => [vaultAnswerPaymentHandler]).scoped(),
    vaultAnswerService: asFunction((cradle: Cradle) => new VaultAnswerService({
      vaultAnswerRepository: cradle.vaultAnswerRepository,
      paymentRepository: cradle.paymentRepository,
      noteSelector: cradle.noteSelector,
      invitationService: cradle.invitationService,
      paymentGateway: cradle.paymentGateway,
      paymentService: cradle.paymentService,
      eventBus: cradle.eventBus,
      logger: cradle.logger,
      clock: cradle.clock,
      vaultSettings: cradle.vaultSettings,
      assertAIReady: cradle.assertAIReady,
      vaultGenerationTask: cradle.vaultGenerationTask,
      termsService: cradle.termsService,
    })).scoped(),
    vaultReleaseService: asFunction(({ vaultAnswerRepository, paymentRepository, ledgerEntryRepository, unitOfWork, eventBus, clock }: Cradle) => new VaultReleaseService({ vaultAnswerRepository, paymentRepository, ledgerEntryRepository, unitOfWork, eventBus, clock })).scoped(),
    vaultGenerationTask: asFunction(({ vaultAnswerRepository, vaultReleaseService, noteSelector, answerGenerator, eventBus, logger, clock }: Cradle) => new VaultGenerationTask({ vaultAnswerRepository, vaultReleaseService, noteSelector, answerGenerator, eventBus, logger, clock })).scoped(),
    vaultReviewService: asFunction(({ vaultAnswerRepository, paymentRepository, ledgerEntryRepository, noteRepository, vaultReleaseService, unitOfWork, eventBus, clock }: Cradle) => new VaultReviewService({ vaultAnswerRepository, paymentRepository, ledgerEntryRepository, noteRepository, vaultReleaseService, unitOfWork, eventBus, clock })).scoped(),
    vaultExpireReviewsTask: asFunction(({ vaultAnswerRepository, eventBus, clock }: Cradle) => new VaultExpireReviewsTask({ vaultAnswerRepository, eventBus, clock })).scoped(),
    termsService: asFunction(({ termsRepository, clock }: Cradle) => new TermsService({ termsRepository, clock })).scoped(),
    retentionSweepTask: asFunction(({ retentionRepository, unitOfWork, clock }: Cradle) => new RetentionSweepTask({ retentionRepository, unitOfWork, clock })).scoped(),
    retentionService: asFunction(({ retentionRepository, clock }: Cradle) => new RetentionService({ retentionRepository, clock })).scoped(),
    pilotMetricsService: asFunction(({ pilotMetricsRepository }: Cradle) => new PilotMetricsService(pilotMetricsRepository)).scoped(),
    stripeConnectGateway: asFunction(() => new StripeConnectGateway(getPaymentSettings())).singleton(),
    connectPayoutService: asFunction(({ connectPayoutRepository, stripeConnectGateway, invitationService, userRepository, termsService, clock }: Cradle) => new ConnectPayoutService({ repository: connectPayoutRepository, gateway: stripeConnectGateway, invitationService, userRepository, termsService, clock })).scoped(),
    sessionNoteService: asFunction(({ sessionNoteRepository, bookingService }: Cradle) => new SessionNoteService({ sessionNoteRepository, bookingService })).scoped(),
    assertAIReady: asValue(assertConfiguredAIReadyToCharge),
    refundService: asClass(RefundService).scoped(),
    messageService: asClass(MessageService).scoped(),
    noteService: asFunction(({ noteRepository, invitationService, eventBus, clock, vaultSettings, termsService }: Cradle) => new NoteService({ noteRepository, invitationService, eventBus, clock, vaultSettings, termsService })).scoped(),
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
