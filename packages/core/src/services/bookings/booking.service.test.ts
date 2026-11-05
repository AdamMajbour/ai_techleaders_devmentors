/** @jest-environment node */
import type { Booking, MentorProfile, NewBooking } from '@devmentor/db';
import { CURRENCY, SESSION_25_PRICE_MINOR, SESSION_DURATION_MINUTES } from '../../constants';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
import type { NormalizedPaymentEvent } from '../payments/payment-gateway.port';
import { BookingService } from './booking.service';

const SEEKER_ID = 'seeker-1';
const MENTOR_ID = '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const PROFILE_ID = '2c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const NOW = new Date('2026-11-05T12:00:00.000Z');

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    seekerId: SEEKER_ID,
    mentorId: MENTOR_ID,
    question: 'How do I fix this?',
    durationMinutes: SESSION_DURATION_MINUTES,
    priceMinor: SESSION_25_PRICE_MINOR,
    currency: CURRENCY,
    status: 'pending_payment',
    source: 'link',
    landedAt: NOW,
    startsAt: null,
    endsAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Booking;
}

function makeProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: PROFILE_ID,
    userId: MENTOR_ID,
    slug: 'ada-lovelace',
    headline: 'Backend mentor',
    bio: 'A helpful mentor.',
    technologies: 'typescript',
    publicWorkUrl: 'https://example.com',
    isListed: true,
    lastActiveAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as MentorProfile;
}

function setup(options: {
  isPilotMember?: boolean;
  isAcceptedSeeker?: boolean;
  isAcceptedMentor?: boolean;
  profile?: MentorProfile | null;
  gatewayError?: Error;
  failCheckoutError?: Error;
  sessionSaveFails?: boolean;
  checkoutEvent?: NormalizedPaymentEvent | null;
} = {}) {
  const booking = makeBooking();
  const payment = { status: 'pending', providerSessionId: 'session-1' };
  const createWithPayment = jest.fn(async (data: NewBooking) => {
    booking.landedAt = data.landedAt;
    return { booking, payment };
  });
  const failCheckout = jest.fn(async () => {
    if (options.failCheckoutError) throw options.failCheckoutError;
    booking.status = 'payment_failed';
    payment.status = 'failed';
  });
  const setProviderSession = jest.fn(async () => options.sessionSaveFails ? null : {});
  const findById = jest.fn(async () => options.profile === undefined ? makeProfile() : options.profile);
  const findBookingById = jest.fn(async () => booking);
  const findForParticipant = jest.fn(async () => [booking]);
  const findByBookingId = jest.fn(async () => payment);
  const findUserById = jest.fn(async (id: string) => ({
    id,
    name: id === MENTOR_ID ? 'Ada Mentor' : 'Sam Seeker',
    email: id === MENTOR_ID ? 'mentor@example.com' : 'seeker@example.com',
  }));
  const getCheckout = jest.fn(async () => options.checkoutEvent ?? null);
  const handleEvent = jest.fn(async (event: NormalizedPaymentEvent) => {
    if (booking.status !== 'pending_payment') return;
    booking.status = event.type === 'checkout.completed' ? 'paid' : 'payment_failed';
    payment.status = event.type === 'checkout.completed' ? 'succeeded' : 'failed';
  });
  const invitationService = {
    isPilotMember: jest.fn(async () => options.isPilotMember ?? true),
    isAcceptedSeeker: jest.fn(async () => options.isAcceptedSeeker ?? true),
    isAcceptedMentor: jest.fn(async () => options.isAcceptedMentor ?? true),
  };
  const createCheckout = options.gatewayError
    ? jest.fn(async () => { throw options.gatewayError; })
    : jest.fn(async () => ({ providerSessionId: 'session-1', url: 'https://checkout.example/session-1' }));
  const emit = jest.fn(async () => undefined);
  const clock: Clock = { now: () => new Date(NOW) };
  const service = new BookingService({
    bookingRepository: { createWithPayment, failCheckout, findById: findBookingById, findForParticipant } as never,
    mentorProfileRepository: { findById, findByUserId: jest.fn(async () => makeProfile()) } as never,
    paymentRepository: { setProviderSession, findByBookingId } as never,
    userRepository: { findById: findUserById } as never,
    invitationService,
    paymentGateway: {
      provider: 'mock',
      createCheckout,
      refund: jest.fn(),
      verifyWebhook: jest.fn(async () => true),
      parseWebhook: jest.fn(),
      getCheckout,
    },
    paymentService: { handleEvent } as never,
    eventBus: { emit } as never,
    clock,
  });

  return {
    service,
    booking,
    payment,
    createWithPayment,
    failCheckout,
    setProviderSession,
    findById,
    invitationService,
    createCheckout,
    emit,
    findBookingById,
    findForParticipant,
    findByBookingId,
    findUserById,
    getCheckout,
    handleEvent,
  };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  mentorId: PROFILE_ID,
  question: 'How do I fix this?',
  source: 'link',
  landedAt: NOW.toISOString(),
  ...overrides,
});

describe('BookingService.create', () => {
  it('uses the session seeker, ignores client price/duration, and sends fixed checkout values', async () => {
    const deps = setup();
    const result = await deps.service.create(
      { userId: SEEKER_ID },
      input({ priceMinor: 1, durationMinutes: 90, seekerId: 'attacker' }),
    );

    expect(deps.createWithPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        seekerId: SEEKER_ID,
        mentorId: MENTOR_ID,
        durationMinutes: SESSION_DURATION_MINUTES,
        priceMinor: SESSION_25_PRICE_MINOR,
        currency: CURRENCY,
        status: 'pending_payment',
      }),
      expect.objectContaining({
        amountMinor: SESSION_25_PRICE_MINOR,
        currency: CURRENCY,
        status: 'pending',
      }),
    );
    expect(deps.createCheckout).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      amountMinor: SESSION_25_PRICE_MINOR,
      currency: CURRENCY,
      idempotencyKey: 'booking:booking-1:checkout',
    });
    expect(deps.setProviderSession).toHaveBeenCalledWith('booking-1', 'session-1');
    expect(result).toMatchObject({
      booking: { status: 'pending_payment', priceMinor: 2500, currency: 'EUR', durationMinutes: 25 },
      checkoutUrl: 'https://checkout.example/session-1',
    });
    expect(deps.emit).toHaveBeenCalledWith('bookings.booking.created', {
      bookingId: 'booking-1',
      seekerId: SEEKER_ID,
      mentorId: MENTOR_ID,
    });
  });

  describe('BookingService reads and payment reconciliation', () => {
    const completed: NormalizedPaymentEvent = {
      type: 'checkout.completed',
      bookingId: 'booking-1',
      providerSessionId: 'session-1',
      providerPaymentId: 'provider-payment-1',
      amountMinor: SESSION_25_PRICE_MINOR,
      currency: CURRENCY,
      livemode: false,
    };

    it('keeps question and attribution visibility participant- and status-scoped', async () => {
      const deps = setup();
      const seeker = await deps.service.getById({ userId: SEEKER_ID }, 'booking-1');
      expect(seeker).toMatchObject({
        question: 'How do I fix this?',
        source: 'link',
        landedAt: NOW.toISOString(),
        counterpartName: 'Ada Mentor',
        mentor: { id: PROFILE_ID, slug: 'ada-lovelace', name: 'Ada Mentor' },
      });

      await expect(deps.service.getById({ userId: MENTOR_ID }, 'booking-1')).rejects.toBeInstanceOf(NotFoundError);
      await expect(deps.service.getById({ userId: 'outsider' }, 'booking-1')).rejects.toBeInstanceOf(NotFoundError);

      deps.booking.status = 'paid';
      const paidMentorView = await deps.service.getById({ userId: MENTOR_ID }, 'booking-1');
      expect(paidMentorView.question).toBe('How do I fix this?');
      expect(paidMentorView).not.toHaveProperty('source');
      expect(paidMentorView).not.toHaveProperty('landedAt');
      expect(paidMentorView).not.toHaveProperty('counterpartEmail');

      deps.booking.status = 'payment_failed';
      const mentorList = await deps.service.list({ userId: MENTOR_ID }, { role: 'mentor', page: 1 });
      expect(mentorList.items).toHaveLength(0);
    });

    it('uses the same idempotent payment handler to recover a lost webhook', async () => {
      const deps = setup({ checkoutEvent: completed });

      const first = await deps.service.reconcilePayment({ userId: SEEKER_ID }, 'booking-1');
      const second = await deps.service.reconcilePayment({ userId: SEEKER_ID }, 'booking-1');

      expect(deps.getCheckout).toHaveBeenCalledTimes(1);
      expect(deps.getCheckout).toHaveBeenCalledWith('session-1');
      expect(deps.handleEvent).toHaveBeenCalledTimes(1);
      expect(deps.handleEvent).toHaveBeenCalledWith(completed);
      expect(first.status).toBe('paid');
      expect(second.status).toBe('paid');
    });

    it('does not transition again when reconciliation follows the webhook', async () => {
      const deps = setup({ checkoutEvent: completed });
      await deps.handleEvent(completed);

      const result = await deps.service.reconcilePayment({ userId: SEEKER_ID }, 'booking-1');

      expect(result.status).toBe('paid');
      expect(deps.getCheckout).not.toHaveBeenCalled();
      expect(deps.handleEvent).toHaveBeenCalledTimes(1);
    });

    it('leaves an unpaid provider checkout pending', async () => {
      const deps = setup({ checkoutEvent: null });

      const result = await deps.service.reconcilePayment({ userId: SEEKER_ID }, 'booking-1');

      expect(result.status).toBe('pending_payment');
      expect(deps.handleEvent).not.toHaveBeenCalled();
    });

    it('does not let the mentor reconcile a seeker payment', async () => {
      const deps = setup({ checkoutEvent: completed });

      await expect(deps.service.reconcilePayment({ userId: MENTOR_ID }, 'booking-1')).rejects.toBeInstanceOf(ForbiddenError);
      expect(deps.getCheckout).not.toHaveBeenCalled();
      expect(deps.handleEvent).not.toHaveBeenCalled();
    });

    it('never marks a failed checkout paid', async () => {
      const deps = setup({
        checkoutEvent: {
          type: 'checkout.failed',
          bookingId: 'booking-1',
          providerSessionId: 'session-1',
          amountMinor: SESSION_25_PRICE_MINOR,
          currency: CURRENCY,
          livemode: false,
        },
      });

      const result = await deps.service.reconcilePayment({ userId: SEEKER_ID }, 'booking-1');

      expect(result.status).toBe('payment_failed');
      expect(deps.booking.status).toBe('payment_failed');
      expect(deps.booking.status).not.toBe('paid');
    });
  });

  it.each([
    ['future', '2026-11-06T12:00:00.000Z', NOW],
    ['older than a day', '2026-11-03T11:59:59.999Z', new Date(NOW.getTime() - 24 * 60 * 60 * 1000)],
    ['within the window', '2026-11-05T10:00:00.000Z', new Date('2026-11-05T10:00:00.000Z')],
  ])('clamps %s landedAt attribution', async (_label, requested, expected) => {
    const deps = setup();
    await deps.service.create({ userId: SEEKER_ID }, input({ landedAt: requested }));
    expect(deps.createWithPayment.mock.calls[0][0].landedAt).toEqual(expected);
  });

  it.each([
    ['invalid source', input({ source: 'email' })],
    ['empty question', input({ question: '   ' })],
    ['question over the limit', input({ question: 'q'.repeat(4001) })],
  ])('rejects %s before persisting', async (_label, badInput) => {
    const deps = setup();
    await expect(deps.service.create({ userId: SEEKER_ID }, badInput)).rejects.toBeInstanceOf(ValidationError);
    expect(deps.createWithPayment).not.toHaveBeenCalled();
    expect(deps.createCheckout).not.toHaveBeenCalled();
  });

  it('requires an authenticated seeker account', async () => {
    const unauthenticated = setup();
    await expect(unauthenticated.service.create(undefined as never, input())).rejects.toBeInstanceOf(UnauthorizedError);
    expect(unauthenticated.findById).not.toHaveBeenCalled();

    const nonMember = setup({ isPilotMember: false });
    await expect(nonMember.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(NotFoundError);
    expect(nonMember.createWithPayment).not.toHaveBeenCalled();

    const memberWithoutSeekerInvitation = setup({ isAcceptedSeeker: false });
    await expect(memberWithoutSeekerInvitation.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(ForbiddenError);
    expect(memberWithoutSeekerInvitation.findById).not.toHaveBeenCalled();
  });

  it('rejects self-booking and profiles that are missing, unlisted, or no longer accepted mentors', async () => {
    const self = setup({ profile: makeProfile({ userId: SEEKER_ID }) });
    await expect(self.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(ForbiddenError);

    const missing = setup({ profile: null });
    await expect(missing.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(NotFoundError);

    const unlisted = setup({ profile: makeProfile({ isListed: false }) });
    await expect(unlisted.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(NotFoundError);

    const unavailable = setup({ isAcceptedMentor: false });
    await expect(unavailable.service.create({ userId: SEEKER_ID }, input())).rejects.toBeInstanceOf(NotFoundError);
    expect(unavailable.createWithPayment).not.toHaveBeenCalled();
  });

  it('marks checkout failures terminal without emitting a created event or returning a paid booking', async () => {
    const gatewayError = new Error('Checkout unavailable');
    const deps = setup({ gatewayError });
    await expect(deps.service.create({ userId: SEEKER_ID }, input())).rejects.toBe(gatewayError);
    expect(deps.failCheckout).toHaveBeenCalledWith('booking-1');
    expect(deps.booking.status).toBe('payment_failed');
    expect(deps.booking.status).not.toBe('paid');
    expect(deps.payment.status).toBe('failed');
    expect(deps.emit).not.toHaveBeenCalled();
  });

  it('surfaces both the gateway failure and failure to persist payment_failed', async () => {
    const gatewayError = new Error('Checkout unavailable');
    const persistenceError = new Error('Database unavailable');
    const deps = setup({ gatewayError, failCheckoutError: persistenceError });

    let caught: unknown;
    try {
      await deps.service.create({ userId: SEEKER_ID }, input());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([gatewayError, persistenceError]);
    expect(deps.booking.status).toBe('pending_payment');
    expect(deps.booking.status).not.toBe('paid');
    expect(deps.emit).not.toHaveBeenCalled();
  });

  it('records only the clamped timestamp when no attribution timestamp was provided', async () => {
    const deps = setup();
    await deps.service.create({ userId: SEEKER_ID }, input({ landedAt: undefined }));
    expect(deps.createWithPayment.mock.calls[0][0].landedAt).toEqual(NOW);
  });

  it('allows the supported list attribution source', async () => {
    const deps = setup();
    await deps.service.create({ userId: SEEKER_ID }, input({ source: 'list' }));
    expect(deps.createWithPayment.mock.calls[0][0].source).toBe('list');
  });

  it('does not emit the creation event when persistence of the checkout session fails', async () => {
    const deps = setup({ sessionSaveFails: true });
    await expect(deps.service.create({ userId: SEEKER_ID }, input())).rejects.toThrow(
      'Pending booking payment was not found.',
    );
    expect(deps.failCheckout).toHaveBeenCalledWith('booking-1');
    expect(deps.booking.status).not.toBe('paid');
    expect(deps.emit).not.toHaveBeenCalled();
  });
});
