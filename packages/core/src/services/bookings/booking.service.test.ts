/** @jest-environment node */
import { ExclusionConstraintViolationError, type Booking, type MentorProfile, type NewBooking } from '@devmentor/db';
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
    startsAt: new Date(NOW.getTime() + 60 * 60 * 1000),
    endsAt: new Date(NOW.getTime() + 85 * 60 * 1000),
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
  transitionError?: Error;
  settlementCandidates?: Booking[];
  paidAt?: Date;
  responseWindowMinutes?: number;
  autoApproveReasons?: Array<'mentor_declined' | 'mentor_unresponsive'>;
  paymentStatus?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
} = {}) {
  const booking = makeBooking();
  const payment = {
    id: 'payment-1',
    status: options.paymentStatus ?? 'pending',
    providerPaymentId: 'provider-payment-1',
    amountMinor: SESSION_25_PRICE_MINOR,
    providerSessionId: 'session-1',
  };
  const createWithPayment = jest.fn(async (data: NewBooking, _paymentData?: unknown) => {
    void _paymentData;
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
  const findForSettlement = jest.fn(async ({ before }: { before: Date }) =>
    options.paidAt && options.paidAt.getTime() > before.getTime()
      ? []
      : options.settlementCandidates ?? [],
  );
  const transitionBooking = jest.fn(async (
    _id: string,
    status: 'accepted' | 'declined',
    _actorUserId: string,
    patch: Record<string, unknown> = {},
  ) => {
    if (options.transitionError) throw options.transitionError;
    booking.status = status;
    Object.assign(booking, patch);
    return true;
  });
  const findByBookingId = jest.fn(async () => payment);
  const findUserById = jest.fn(async (id: string) => ({
    id,
    name: id === MENTOR_ID ? 'Ada Mentor' : 'Sam Seeker',
    email: id === MENTOR_ID ? 'mentor@example.com' : 'seeker@example.com',
  }));
  const expirePaid = jest.fn(async (_id: string) => {
    if (booking.status !== 'paid') return false;
    booking.status = 'expired';
    return true;
  });
  const findMentorProfileByUserId = jest.fn(async () => makeProfile());
  const updateMentorProfile = jest.fn(async () => makeProfile({ lastActiveAt: NOW }));
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
  const refund = jest.fn(async () => undefined);
  const emit = jest.fn(async () => undefined);
  const approvalRequests = new Map<string, { id: string; status: 'pending' | 'approved' | 'rejected' }>();
  if (options.approvalStatus) {
    approvalRequests.set('refund:payment:payment-1', { id: 'approval-1', status: options.approvalStatus });
  }
  const requestApproval = jest.fn(async (
    kind: string,
    subject: { type: string; id: string },
  ) => {
    const key = `${kind}:${subject.type}:${subject.id}`;
    const existing = approvalRequests.get(key);
    if (existing) return existing;
    const approval = { id: 'approval-1', status: 'pending' as const };
    approvalRequests.set(key, approval);
    return approval;
  });
  const findBySubjectStatuses = jest.fn(async (
    kind: string,
    subjectType: string,
    subjectId: string,
    statuses: readonly string[],
  ) => {
    const approval = approvalRequests.get(`${kind}:${subjectType}:${subjectId}`);
    return approval && statuses.includes(approval.status) ? approval : null;
  });
  const approveAutomatically = jest.fn(async () => {
    const approval = approvalRequests.get('refund:payment:payment-1');
    if (approval) approval.status = 'approved';
    return { id: 'approval-1', status: 'refunded' as const };
  });
  const clock: Clock = { now: () => new Date(NOW) };
  const service = new BookingService({
    bookingRepository: {
      createWithPayment,
      failCheckout,
      findById: findBookingById,
      findForParticipant,
      findForSettlement,
      expirePaid,
      transitionStatus: transitionBooking,
    } as never,
    availabilitySlotRepository: {
      reserveWithBooking: jest.fn(async (_slotId: string, _mentorId: string, _now: Date, data: NewBooking, paymentData: unknown) => {
        const result = await createWithPayment(data, paymentData);
        return result;
      }),
    } as never,
    mentorProfileRepository: {
      findById,
      findByUserId: findMentorProfileByUserId,
      update: updateMentorProfile,
    } as never,
    paymentRepository: { setProviderSession, findByBookingId } as never,
    userRepository: { findById: findUserById } as never,
    invitationService,
    paymentGateway: {
      provider: 'mock',
      createCheckout,
      refund,
      verifyWebhook: jest.fn(async () => true),
      parseWebhook: jest.fn(),
      getCheckout,
    },
    paymentService: { handleEvent } as never,
    approvalService: { request: requestApproval } as never,
    approvalRequestRepository: { findBySubjectStatuses } as never,
    refundService: { approveAutomatically } as never,
    bookingSettings: () => ({
      MENTOR_RESPONSE_WINDOW_MINUTES: options.responseWindowMinutes ?? 120,
      REFUND_AUTO_APPROVE_REASONS: options.autoApproveReasons ?? [],
    }),
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
    findForSettlement,
    transitionBooking,
    expirePaid,
    approvalRequests,
    requestApproval,
    findBySubjectStatuses,
    approveAutomatically,
    refund,
    findByBookingId,
    findUserById,
    findMentorProfileByUserId,
    updateMentorProfile,
    getCheckout,
    handleEvent,
  };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  mentorId: PROFILE_ID,
  availabilitySlotId: '3c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  question: 'How do I fix this?',
  acceptedTerms: true,
  termsVersionId: '00000000-0000-4000-8000-000000000001',
  termsSha256: 'a'.repeat(64),
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
        availabilitySlotId: '3c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
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

  describe('BookingService mentor actions', () => {
  it('confirms the seeker-selected slot and exposes seeker e-mail only after acceptance', async () => {
      const deps = setup();
      deps.booking.status = 'paid';

      const accepted = await deps.service.accept({ userId: MENTOR_ID }, 'booking-1', {});

      expect(deps.transitionBooking).toHaveBeenCalledWith('booking-1', 'accepted', MENTOR_ID, {
        startsAt: deps.booking.startsAt,
        endsAt: deps.booking.endsAt,
      });
      expect(deps.updateMentorProfile).toHaveBeenCalledWith(PROFILE_ID, { lastActiveAt: NOW });
      expect(deps.emit).toHaveBeenCalledWith('bookings.booking.accepted', { bookingId: 'booking-1' });
      expect(accepted).toMatchObject({
        status: 'accepted',
        question: 'How do I fix this?',
        counterpartEmail: 'seeker@example.com',
        startsAt: deps.booking.startsAt?.toISOString(),
        endsAt: deps.booking.endsAt?.toISOString(),
      });
    });

    it('does not allow the mentor to replace the time chosen by the seeker', async () => {
      const deps = setup();
      deps.booking.status = 'paid';

      await expect(deps.service.accept({ userId: MENTOR_ID }, 'booking-1', { startsAt: '2026-11-05T20:00:00.000Z' }))
        .rejects.toBeInstanceOf(ValidationError);
      expect(deps.transitionBooking).not.toHaveBeenCalled();
    });

    it('rejects acceptance after the reserved slot start time has passed', async () => {
      const deps = setup();
      deps.booking.status = 'paid';
      deps.booking.startsAt = new Date(NOW.getTime() - 1);

      await expect(deps.service.accept({ userId: MENTOR_ID }, 'booking-1', {}))
        .rejects.toBeInstanceOf(ValidationError);
      expect(deps.transitionBooking).not.toHaveBeenCalled();
      expect(deps.updateMentorProfile).not.toHaveBeenCalled();
    });

    it('maps a database overlap conflict to an actionable core conflict', async () => {
      const deps = setup({ transitionError: new ExclusionConstraintViolationError() });
      deps.booking.status = 'paid';

      await expect(deps.service.accept({ userId: MENTOR_ID }, 'booking-1', {}))
        .rejects.toMatchObject({
          name: 'ConflictError',
          message: 'That time is no longer available. Please choose another time.',
        });
      expect(deps.updateMentorProfile).not.toHaveBeenCalled();
      expect(deps.emit).not.toHaveBeenCalled();
    });

    it('declines paid bookings without exposing the question and records deliberate mentor activity', async () => {
      const deps = setup();
      deps.booking.status = 'paid';
      deps.payment.status = 'succeeded';

      const declined = await deps.service.decline({ userId: MENTOR_ID }, 'booking-1');

      expect(deps.transitionBooking).toHaveBeenCalledWith('booking-1', 'declined', MENTOR_ID);
      expect(deps.updateMentorProfile).toHaveBeenCalledWith(PROFILE_ID, { lastActiveAt: NOW });
      expect(deps.emit).toHaveBeenCalledWith('bookings.booking.declined', { bookingId: 'booking-1' });
      expect(deps.requestApproval).toHaveBeenCalledWith(
        'refund',
        { type: 'payment', id: 'payment-1' },
        'mentor_declined',
      );
      expect(deps.refund).not.toHaveBeenCalled();
      expect(declined.status).toBe('declined');
      expect(declined).not.toHaveProperty('question');
      expect(declined).not.toHaveProperty('counterpartEmail');
    });

    it('reuses one refund approval for duplicate decline requests', async () => {
      const deps = setup();
      deps.booking.status = 'paid';
      deps.payment.status = 'succeeded';

      await deps.service.decline({ userId: MENTOR_ID }, 'booking-1');
      await deps.service.decline({ userId: MENTOR_ID }, 'booking-1');

      expect(deps.approvalRequests.size).toBe(1);
      expect(deps.requestApproval).toHaveBeenCalledTimes(2);
      expect(deps.refund).not.toHaveBeenCalled();
    });

    it('auto-approves and executes only reasons explicitly configured for automatic approval', async () => {
      const auto = setup({ autoApproveReasons: ['mentor_declined'] });
      auto.booking.status = 'paid';
      auto.payment.status = 'succeeded';
      await auto.service.decline({ userId: MENTOR_ID }, 'booking-1');
      expect(auto.approveAutomatically).toHaveBeenCalledWith('approval-1');

      const disabled = setup();
      disabled.booking.status = 'paid';
      disabled.payment.status = 'succeeded';
      await disabled.service.decline({ userId: MENTOR_ID }, 'booking-1');
      expect(disabled.approveAutomatically).not.toHaveBeenCalled();
    });

    it('fails closed for non-mentors and bookings not owned by the session user', async () => {
      const nonMentor = setup({ isAcceptedMentor: false });
      nonMentor.booking.status = 'paid';
      await expect(nonMentor.service.accept({ userId: MENTOR_ID }, 'booking-1', {})).rejects.toBeInstanceOf(NotFoundError);
      expect(nonMentor.findBookingById).not.toHaveBeenCalled();

      const wrongOwner = setup();
      wrongOwner.booking.status = 'paid';
      await expect(wrongOwner.service.decline({ userId: SEEKER_ID }, 'booking-1')).rejects.toBeInstanceOf(NotFoundError);
      expect(wrongOwner.transitionBooking).not.toHaveBeenCalled();
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

    it.each([
      ['none', 'succeeded', undefined],
      ['pending_approval', 'succeeded', 'pending'],
      ['processing', 'refund_pending', 'approved'],
      ['refunded', 'refunded', 'approved'],
    ] as const)('derives refundStatus=%s identically for seeker and mentor', async (refundStatus, paymentStatus, approvalStatus) => {
      const deps = setup({ paymentStatus, approvalStatus });
      deps.booking.status = 'paid';
      const [seeker, mentor] = await Promise.all([
        deps.service.getById({ userId: SEEKER_ID }, 'booking-1'),
        deps.service.getById({ userId: MENTOR_ID }, 'booking-1'),
      ]);
      expect(seeker.refundStatus).toBe(refundStatus);
      expect(mentor.refundStatus).toBe(refundStatus);
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

  describe('BookingService lazy expiry and refund approvals', () => {
    it.each([
      ['at the response deadline', 0, true],
      ['one millisecond before it', 1, false],
    ])('expires only a paid booking %s', async (_label, millisecondsAfterDeadline, shouldExpire) => {
      const deps = setup({
        responseWindowMinutes: 120,
        autoApproveReasons: ['mentor_unresponsive'],
      });
      deps.booking.status = 'paid';
      deps.payment.status = 'succeeded';
      const paidAt = new Date(NOW.getTime() - 120 * 60_000 + millisecondsAfterDeadline);
      deps.findForSettlement.mockImplementation(async ({ before }) =>
        paidAt.getTime() <= before.getTime() ? [deps.booking] : [],
      );

      expect(await deps.service.settleExpired()).toBe(shouldExpire ? 1 : 0);
      expect(deps.booking.status).toBe(shouldExpire ? 'expired' : 'paid');
      expect(deps.requestApproval).toHaveBeenCalledTimes(shouldExpire ? 1 : 0);
      if (shouldExpire) {
        expect(deps.requestApproval).toHaveBeenCalledWith(
          'refund',
          { type: 'payment', id: 'payment-1' },
          'mentor_unresponsive',
        );
        expect([...deps.approvalRequests.values()]).toEqual([
          { id: 'approval-1', status: shouldExpire ? 'approved' : 'pending' },
        ]);
        expect(deps.approveAutomatically).toHaveBeenCalledTimes(shouldExpire ? 1 : 0);
      }
      expect(deps.refund).not.toHaveBeenCalled();
    });

    it('is idempotent when duplicate settlement reads race', async () => {
      const deps = setup();
      deps.booking.status = 'paid';
      deps.payment.status = 'succeeded';
      deps.findForSettlement.mockResolvedValue([deps.booking]);

      const results = await Promise.all([
        deps.service.list({ userId: SEEKER_ID }, { role: 'seeker', page: 1 }),
        deps.service.list({ userId: SEEKER_ID }, { role: 'seeker', page: 1 }),
      ]);

      expect(deps.booking.status).toBe('expired');
      expect(deps.approvalRequests.size).toBe(1);
      expect(deps.findForSettlement).toHaveBeenCalledTimes(2);
      expect(deps.refund).not.toHaveBeenCalled();
    });

    it('opens operator refunds only for operators and paid or accepted bookings', async () => {
      const previous = process.env.OPERATOR_USER_IDS;
      process.env.OPERATOR_USER_IDS = MENTOR_ID;
      const deps = setup();
      try {
        await expect(deps.service.requestRefund({ userId: SEEKER_ID }, 'booking-1'))
          .rejects.toBeInstanceOf(ForbiddenError);
        expect(deps.requestApproval).not.toHaveBeenCalled();

        await expect(deps.service.requestRefund({ userId: MENTOR_ID }, 'booking-1'))
          .rejects.toMatchObject({ name: 'ConflictError' });
        expect(deps.requestApproval).not.toHaveBeenCalled();

        deps.booking.status = 'paid';
        deps.payment.status = 'succeeded';
        await expect(deps.service.requestRefund({ userId: MENTOR_ID }, 'booking-1'))
          .resolves.toEqual({ approvalId: 'approval-1' });
        deps.booking.status = 'accepted';
        await expect(deps.service.requestRefund({ userId: MENTOR_ID }, 'booking-1'))
          .resolves.toEqual({ approvalId: 'approval-1' });
        expect(deps.approvalRequests.size).toBe(1);
        expect(deps.requestApproval).toHaveBeenCalledWith(
          'refund',
          { type: 'payment', id: 'payment-1' },
          'operator_initiated',
        );
        expect(deps.refund).not.toHaveBeenCalled();
      } finally {
        if (previous === undefined) delete process.env.OPERATOR_USER_IDS;
        else process.env.OPERATOR_USER_IDS = previous;
      }
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
