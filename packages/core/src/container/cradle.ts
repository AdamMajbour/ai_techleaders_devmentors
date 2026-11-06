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
} from '@devmentor/db';
import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logger';
import type { ArticleService } from '../services/articles/article.service';
import type { AuthService } from '../services/auth/auth.service';
import type { UserService } from '../services/auth/user.service';
import type { PaymentGateway } from '../services/payments/payment-gateway.port';
import type { Mailer } from '../services/notifications/mailer.port';
import type { Clock } from '../utils/clock';
import type { BookingSettings } from '../config/env';
import type { ApprovalService, ApproverResolvers } from '../services/approvals/approval.service';
import type { InvitationService } from '../services/auth/invitation.service';
import type { MagicLinkService } from '../services/auth/magic-link.service';
import type { MentorService } from '../services/mentors/mentor.service';
import type { BookingService } from '../services/bookings/booking.service';
import type { PaymentService } from '../services/payments/payment.service';
import type { RefundService } from '../services/refunds/refund.service';
import type { MessageService } from '../services/messages/message.service';

/** Every dependency the container can provide. A new service is one line here and one in container.ts. */
export interface Cradle {
  logger: Logger;
  clock: Clock;
  bookingSettings: () => BookingSettings;
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
  approverResolvers: ApproverResolvers;
  paymentGateway: PaymentGateway;
  mailer: Mailer;
}

/** The part of the ORM the container needs (lets tests pass a fake). */
export interface OrmLike {
  em: { fork(): EntityManager };
}
