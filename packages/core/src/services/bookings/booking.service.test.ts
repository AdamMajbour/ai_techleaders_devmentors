/** @jest-environment node */
import type { Booking, MentorProfile, NewBooking } from '@devmentor/db';
import { CURRENCY, SESSION_25_PRICE_MINOR, SESSION_DURATION_MINUTES } from '../../constants';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
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
} = {}) {
  const booking = makeBooking();
  const payment = { status: 'pending' };
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
    bookingRepository: { createWithPayment, failCheckout } as never,
    mentorProfileRepository: { findById } as never,
    paymentRepository: { setProviderSession } as never,
    invitationService,
    paymentGateway: {
      provider: 'mock',
      createCheckout,
      refund: jest.fn(),
      verifyWebhook: jest.fn(async () => true),
      parseWebhook: jest.fn(),
      getCheckout: jest.fn(),
    },
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
