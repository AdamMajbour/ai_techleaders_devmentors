import type {
  Booking,
  BookingRepository,
  MentorProfileRepository,
  PaymentRepository,
  UserRepository,
} from '@devmentor/db';
import { CURRENCY, SESSION_25_PRICE_MINOR, SESSION_DURATION_MINUTES } from '../../constants';
import type { EventBus } from '../../events/event-bus';
import { assertOwns, assertParticipant } from '../../http/auth';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { parseOrThrow } from '../../validators/parse';
import { bookingCreateSchema, type BookingCreateInput } from '../../validators/bookings/booking-create.schema';
import type { BookingListQuery } from '../../validators/bookings/booking-list.schema';
import type { InvitationService } from '../auth/invitation.service';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import type { PaymentService } from '../payments/payment.service';
import { MockPaymentGateway } from '../payments/adapters/mock-payment-gateway';
import { toBookingDto, type BookingDto, type BookingPage, type BookingReadDto } from '../dto';

type Dependencies = {
  bookingRepository: BookingRepository;
  mentorProfileRepository: MentorProfileRepository;
  paymentRepository: PaymentRepository;
  userRepository: UserRepository;
  invitationService: Pick<InvitationService, 'isPilotMember' | 'isAcceptedSeeker' | 'isAcceptedMentor'>;
  paymentGateway: PaymentGateway;
  paymentService: Pick<PaymentService, 'handleEvent'>;
  eventBus: EventBus;
  clock: Clock;
};

export interface BookingCreationResult {
  booking: BookingDto;
  checkoutUrl: string;
}

export type MockCheckoutOutcome = 'complete' | 'fail';

export class BookingService {
  private readonly bookingRepository: BookingRepository;
  private readonly mentorProfileRepository: MentorProfileRepository;
  private readonly paymentRepository: PaymentRepository;
  private readonly userRepository: UserRepository;
  private readonly invitationService: Dependencies['invitationService'];
  private readonly paymentGateway: PaymentGateway;
  private readonly paymentService: Dependencies['paymentService'];
  private readonly eventBus: EventBus;
  private readonly clock: Clock;

  constructor({
    bookingRepository,
    mentorProfileRepository,
    paymentRepository,
    userRepository,
    invitationService,
    paymentGateway,
    paymentService,
    eventBus,
    clock,
  }: Dependencies) {
    this.bookingRepository = bookingRepository;
    this.mentorProfileRepository = mentorProfileRepository;
    this.paymentRepository = paymentRepository;
    this.userRepository = userRepository;
    this.invitationService = invitationService;
    this.paymentGateway = paymentGateway;
    this.paymentService = paymentService;
    this.eventBus = eventBus;
    this.clock = clock;
  }

  async create(session: Session, untrustedInput: unknown): Promise<BookingCreationResult> {
    if (!session?.userId) throw new UnauthorizedError();
    const input: BookingCreateInput = parseOrThrow(bookingCreateSchema, untrustedInput);

    if (!(await this.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
    if (!(await this.invitationService.isAcceptedSeeker(session.userId))) throw new ForbiddenError();

    const profile = await this.mentorProfileRepository.findById(input.mentorId);
    if (!profile || !profile.isListed) throw new NotFoundError('Mentor profile not found.');
    if (profile.userId === session.userId) throw new ForbiddenError('You cannot book your own profile.');
    if (!(await this.invitationService.isAcceptedMentor(profile.userId))) {
      throw new NotFoundError('Mentor profile not found.');
    }

    const now = this.clock.now();
    const oldestAllowedLanding = now.getTime() - 24 * 60 * 60 * 1000;
    const requestedLanding = input.landedAt ? new Date(input.landedAt).getTime() : now.getTime();
    const landedAt = new Date(Math.min(now.getTime(), Math.max(oldestAllowedLanding, requestedLanding)));
    const { booking } = await this.bookingRepository.createWithPayment(
      {
        seekerId: session.userId,
        mentorId: profile.userId,
        question: input.question,
        durationMinutes: SESSION_DURATION_MINUTES,
        priceMinor: SESSION_25_PRICE_MINOR,
        currency: CURRENCY,
        status: 'pending_payment',
        source: input.source,
        landedAt,
        startsAt: null,
        endsAt: null,
      },
      {
        provider: this.paymentGateway.provider,
        livemode: false,
        providerSessionId: null,
        providerPaymentId: null,
        amountMinor: SESSION_25_PRICE_MINOR,
        currency: CURRENCY,
        status: 'pending',
      },
    );

    const idempotencyKey = `booking:${booking.id}:checkout`;
    let checkout: Awaited<ReturnType<PaymentGateway['createCheckout']>>;
    try {
      checkout = await this.paymentGateway.createCheckout({
        bookingId: booking.id,
        amountMinor: SESSION_25_PRICE_MINOR,
        currency: CURRENCY,
        idempotencyKey,
      });
      if (!(await this.paymentRepository.setProviderSession(booking.id, checkout.providerSessionId))) {
        throw new Error('Pending booking payment was not found.');
      }
    } catch (error) {
      try {
        await this.bookingRepository.failCheckout(booking.id);
      } catch (persistenceError) {
        throw new AggregateError(
          [error, persistenceError],
          'Checkout failed and the booking could not be marked as payment_failed.',
        );
      }
      throw error;
    }

    await this.eventBus.emit('bookings.booking.created', {
      bookingId: booking.id,
      seekerId: booking.seekerId,
      mentorId: booking.mentorId,
    });
    return { booking: toBookingDto(booking), checkoutUrl: checkout.url };
  }

  async list(session: Session, query: BookingListQuery): Promise<BookingPage> {
    if (!session?.userId) throw new UnauthorizedError();
    const participantBookings = await this.bookingRepository.findForParticipant(session.userId, query.role);
    const bookings = participantBookings.filter((booking) =>
      booking.seekerId === session.userId ||
      !['pending_payment', 'payment_failed'].includes(booking.status),
    );
    const seekerList = query.role === 'seeker';
    const pageSize = seekerList ? Math.max(1, bookings.length) : 10;
    const page = seekerList ? 1 : query.page;
    const pageItems = seekerList
      ? bookings
      : bookings.slice((page - 1) * pageSize, page * pageSize);
    const serverTime = this.clock.now().toISOString();
    return {
      items: await Promise.all(pageItems.map((booking) => this.toParticipantDto(booking, session, serverTime))),
      page,
      pageSize,
      total: bookings.length,
      pageCount: Math.max(1, Math.ceil(bookings.length / pageSize)),
      serverTime,
    };
  }

  async getById(session: Session, id: string): Promise<BookingReadDto> {
    if (!session?.userId) throw new UnauthorizedError();
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found.');
    assertParticipant(session, [booking.seekerId, booking.mentorId]);
    if (
      booking.mentorId === session.userId &&
      ['pending_payment', 'payment_failed'].includes(booking.status)
    ) {
      throw new NotFoundError('Booking not found.');
    }
    return this.toParticipantDto(booking, session, this.clock.now().toISOString());
  }

  async reconcilePayment(session: Session, id: string): Promise<BookingReadDto> {
    if (!session?.userId) throw new UnauthorizedError();
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found.');
    assertOwns(session, booking.seekerId);

    if (booking.status !== 'pending_payment') return this.getById(session, id);

    const payment = await this.paymentRepository.findByBookingId(id);
    if (!payment?.providerSessionId) throw new NotFoundError('Booking payment not found.');

    const event = await this.paymentGateway.getCheckout(payment.providerSessionId);
    if (
      event &&
      event.bookingId === booking.id &&
      event.providerSessionId === payment.providerSessionId
    ) {
      await this.paymentService.handleEvent(event);
    }

    return this.getById(session, id);
  }

  async completeMockCheckout(
    session: Session,
    id: string,
    outcome: MockCheckoutOutcome,
  ): Promise<BookingReadDto> {
    if (!(this.paymentGateway instanceof MockPaymentGateway)) throw new NotFoundError();
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found.');
    assertOwns(session, booking.seekerId);
    if (booking.status !== 'pending_payment') return this.getById(session, id);

    const payment = await this.paymentRepository.findByBookingId(id);
    if (!payment?.providerSessionId) throw new NotFoundError('Booking payment not found.');
    const event = outcome === 'complete'
      ? this.paymentGateway.completeCheckout(payment.providerSessionId)
      : this.paymentGateway.failCheckout(payment.providerSessionId);
    await this.paymentService.handleEvent(event);
    return this.getById(session, id);
  }

  private async toParticipantDto(
    booking: Booking,
    session: Session,
    serverTime: string,
  ): Promise<BookingReadDto> {
    assertParticipant(session, [booking.seekerId, booking.mentorId]);
    const isSeeker = booking.seekerId === session.userId;
    const counterpartId = isSeeker ? booking.mentorId : booking.seekerId;
    const counterpart = await this.userRepository.findById(counterpartId);
    const { question, source, landedAt, ...sharedFields } = toBookingDto(booking);
    const dto: BookingReadDto = {
      ...sharedFields,
      ...(isSeeker || booking.status === 'paid' || booking.status === 'accepted'
        ? { question }
        : {}),
      ...(isSeeker ? { source, landedAt } : {}),
      counterpartName: counterpart?.name ?? (isSeeker ? 'Mentor' : 'Seeker'),
      ...(booking.status === 'accepted' && counterpart ? { counterpartEmail: counterpart.email } : {}),
      refundStatus: 'none',
      allowedActions: isSeeker
        ? booking.status === 'pending_payment' ? ['reconcile_payment'] : []
        : booking.status === 'paid' ? ['accept', 'decline'] : [],
      serverTime,
    };

    if (isSeeker) {
      const [profile, mentor] = await Promise.all([
        this.mentorProfileRepository.findByUserId(booking.mentorId),
        this.userRepository.findById(booking.mentorId),
      ]);
      if (profile) {
        dto.mentor = {
          id: profile.id,
          slug: profile.slug,
          name: mentor?.name ?? profile.slug,
          headline: profile.headline,
          technologies: profile.technologies,
        };
      }
    }
    return dto;
  }
}
