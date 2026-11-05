import type { BookingRepository, MentorProfileRepository, PaymentRepository } from '@devmentor/db';
import { CURRENCY, SESSION_25_PRICE_MINOR, SESSION_DURATION_MINUTES } from '../../constants';
import type { EventBus } from '../../events/event-bus';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { parseOrThrow } from '../../validators/parse';
import { bookingCreateSchema, type BookingCreateInput } from '../../validators/bookings/booking-create.schema';
import type { InvitationService } from '../auth/invitation.service';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import { toBookingDto, type BookingDto } from '../dto';

type Dependencies = {
  bookingRepository: BookingRepository;
  mentorProfileRepository: MentorProfileRepository;
  paymentRepository: PaymentRepository;
  invitationService: Pick<InvitationService, 'isPilotMember' | 'isAcceptedSeeker' | 'isAcceptedMentor'>;
  paymentGateway: PaymentGateway;
  eventBus: EventBus;
  clock: Clock;
};

export interface BookingCreationResult {
  booking: BookingDto;
  checkoutUrl: string;
}

export class BookingService {
  private readonly bookingRepository: BookingRepository;
  private readonly mentorProfileRepository: MentorProfileRepository;
  private readonly paymentRepository: PaymentRepository;
  private readonly invitationService: Dependencies['invitationService'];
  private readonly paymentGateway: PaymentGateway;
  private readonly eventBus: EventBus;
  private readonly clock: Clock;

  constructor({
    bookingRepository,
    mentorProfileRepository,
    paymentRepository,
    invitationService,
    paymentGateway,
    eventBus,
    clock,
  }: Dependencies) {
    this.bookingRepository = bookingRepository;
    this.mentorProfileRepository = mentorProfileRepository;
    this.paymentRepository = paymentRepository;
    this.invitationService = invitationService;
    this.paymentGateway = paymentGateway;
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
}
