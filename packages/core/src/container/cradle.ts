import type {
  EntityManager,
  ArticleRepository,
  UserRepository,
  ApprovalRequestRepository,
  InvitationRepository,
  LoginTokenRepository,
  MentorProfileRepository,
  BookingRepository,
  PaymentRepository,
  MessageRepository,
  NoteRepository,
  AvailabilitySlotRepository,
  LedgerEntryRepository,
  VaultAnswerRepository,
  TermsRepository,
  RetentionRepository,
  PilotMetricsRepository,
  ConnectPayoutRepository,
} from '@devmentor/db';
import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logger';
import type { ArticleService } from '../services/articles/article.service';
import type { AuthService } from '../services/auth/auth.service';
import type { UserService } from '../services/auth/user.service';
import type { PaymentGateway } from '../services/payments/payment-gateway.port';
import type { Mailer } from '../services/notifications/mailer.port';
import type { Clock } from '../utils/clock';
import type { BookingSettings, VaultSettings } from '../config/env';
import type { ApprovalService, ApproverResolvers } from '../services/approvals/approval.service';
import type { InvitationService } from '../services/auth/invitation.service';
import type { MagicLinkService } from '../services/auth/magic-link.service';
import type { MentorService } from '../services/mentors/mentor.service';
import type { BookingService } from '../services/bookings/booking.service';
import type { PaymentService } from '../services/payments/payment.service';
import type { RefundService } from '../services/refunds/refund.service';
import type { MessageService } from '../services/messages/message.service';
import type { NoteService } from '../services/notes/note.service';
import type { AvailabilityService } from '../services/bookings/availability.service';
import type { LedgerService } from '../services/ledger/ledger.service';
import type { AnswerGenerator } from '../services/ai/answer-generator.port';
import type { NoteSelector } from '../services/vault/note-selector';
import type { VaultAnswerPaymentHandler } from '../services/vault/vault-answer-payment.handler';
import type { PaymentSubjectHandler } from '../services/payments/payment.service';
import type { VaultAnswerService } from '../services/vault/vault-answer.service';
import type { UnitOfWork } from '../workflow/unit-of-work.port';
import type { VaultReleaseService } from '../services/vault/vault-release.service';
import type { VaultGenerationTask } from '../services/vault/vault-generation.task';
import type { VaultReviewService } from '../services/vault/vault-review.service';
import type { VaultExpireReviewsTask } from '../services/vault/vault-expire-reviews.task';
import type { TermsService } from '../services/terms/terms.service';
import type { RetentionSweepTask } from '../services/terms/retention-sweep.task';
import type { RetentionService } from '../services/terms/retention.service';
import type { PilotMetricsService } from '../services/terms/pilot-metrics.service';
import type { StripeConnectPort } from '../services/payouts/stripe-connect.port';
import type { ConnectPayoutService } from '../services/payouts/connect-payout.service';

/** Every dependency the container can provide. A new service is one line here and one in container.ts. */
export interface Cradle {
  logger: Logger;
  clock: Clock;
  bookingSettings: () => BookingSettings;
  vaultSettings: () => VaultSettings;
  eventBus: EventBus;
  orm: OrmLike;
  em: EntityManager;
  userRepository: UserRepository;
  articleRepository: ArticleRepository;
  approvalRequestRepository: ApprovalRequestRepository;
  invitationRepository: InvitationRepository;
  loginTokenRepository: LoginTokenRepository;
  mentorProfileRepository: MentorProfileRepository;
  bookingRepository: BookingRepository;
  paymentRepository: PaymentRepository;
  messageRepository: MessageRepository;
  noteRepository: NoteRepository;
  availabilitySlotRepository: AvailabilitySlotRepository;
  ledgerEntryRepository: LedgerEntryRepository;
  unitOfWork: UnitOfWork;
  vaultAnswerRepository: VaultAnswerRepository;
  termsRepository: TermsRepository;
  retentionRepository: RetentionRepository;
  pilotMetricsRepository: PilotMetricsRepository;
  connectPayoutRepository: ConnectPayoutRepository;
  userService: UserService;
  authService: AuthService;
  articleService: ArticleService;
  approvalService: ApprovalService;
  invitationService: InvitationService;
  magicLinkService: MagicLinkService;
  mentorService: MentorService;
  bookingService: BookingService;
  paymentService: PaymentService;
  refundService: RefundService;
  messageService: MessageService;
  noteService: NoteService;
  availabilityService: AvailabilityService;
  ledgerService: LedgerService;
  answerGenerator: AnswerGenerator;
  noteSelector: NoteSelector;
  vaultAnswerPaymentHandler: VaultAnswerPaymentHandler;
  paymentSubjectHandlers: readonly PaymentSubjectHandler[];
  vaultAnswerService: VaultAnswerService;
  vaultReleaseService: VaultReleaseService;
  vaultGenerationTask: VaultGenerationTask;
  vaultReviewService: VaultReviewService;
  vaultExpireReviewsTask: VaultExpireReviewsTask;
  termsService: TermsService;
  retentionSweepTask: RetentionSweepTask;
  retentionService: RetentionService;
  pilotMetricsService: PilotMetricsService;
  connectPayoutService: ConnectPayoutService;
  assertAIReady: () => void;
  approverResolvers: ApproverResolvers;
  paymentGateway: PaymentGateway;
  stripeConnectGateway: StripeConnectPort;
  mailer: Mailer;
}

/** The part of the ORM the container needs (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}
