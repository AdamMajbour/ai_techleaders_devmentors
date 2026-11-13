/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../core/src/config/env';
import { SESSION_COOKIE, signSession } from '../../../../../core/src/security/session';

const mockBookingService = {
  list: jest.fn(async () => ({ items: [], page: 1, pageSize: 10, total: 0, pageCount: 1, serverTime: 'now' })),
  create: jest.fn(async () => ({ booking: { id: 'booking' }, checkoutUrl: '/checkout' })),
  getById: jest.fn(async () => ({ id: 'booking', status: 'pending_payment' })),
  reconcilePayment: jest.fn(async () => ({ id: 'booking', status: 'paid' })),
  completeMockCheckout: jest.fn(async () => ({ id: 'booking', status: 'paid' })),
  accept: jest.fn(async () => ({ id: 'booking', status: 'accepted' })),
  decline: jest.fn(async () => ({ id: 'booking', status: 'declined' })),
  requestRefund: jest.fn(async () => ({ approvalId: 'approval' })),
};
const mockCradle = { bookingService: mockBookingService } as unknown as Cradle;
const mockWithScope = jest.fn(async (fn: (cradle: Cradle) => Promise<unknown>) => fn(mockCradle));

jest.mock('../../../../../core/src/container/container', () => ({
  ...jest.requireActual('../../../../../core/src/container/container'),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { GET as getBookings, POST as createBooking } from './route';
import { GET as getBookingById } from './[id]/route';
import { POST as reconcilePayment } from './[id]/reconcile-payment/route';
import { POST as mockPayment } from './[id]/mock-payment/route';
import { POST as acceptBooking } from './[id]/accept/route';
import { POST as declineBooking } from './[id]/decline/route';
import { POST as requestBookingRefund } from '../operator/bookings/[id]/refund/route';

const SECRET = 'b'.repeat(48);
const BOOKING_ID = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const context = { params: Promise.resolve({ id: BOOKING_ID }) };
const emptyContext = { params: Promise.resolve({}) };

async function memberHeaders(extra: Record<string, string> = {}) {
  return {
    cookie: `${SESSION_COOKIE}=${await signSession('seeker-id', SECRET)}`,
    ...extra,
  };
}

function mutationHeaders(extra: Record<string, string> = {}) {
  return {
    'x-requested-with': 'devmentor',
    origin: 'http://localhost',
    host: 'localhost',
    'content-type': 'application/json',
    ...extra,
  };
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  resetEnvCache();
  for (const serviceMethod of Object.values(mockBookingService)) serviceMethod.mockClear();
  mockWithScope.mockClear().mockImplementation(async (fn) => fn(mockCradle));
});

describe('/api/bookings CRUD routes', () => {
  it('lists only through the authenticated participant service with validated query values', async () => {
    const response = await getBookings(
      new Request('http://localhost/api/bookings?role=seeker&page=2', { headers: await memberHeaders() }),
      emptyContext,
    );

    expect(response.status).toBe(200);
    expect(mockBookingService.list).toHaveBeenCalledWith(
      { userId: 'seeker-id' },
      { role: 'seeker', page: 2 },
    );
  });

  it('rejects unauthenticated booking reads and malformed booking ids', async () => {
    expect((await getBookings(new Request('http://localhost/api/bookings'), emptyContext)).status).toBe(401);
    const malformed = await getBookingById(
      new Request('http://localhost/api/bookings/not-a-uuid', { headers: await memberHeaders() }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    );
    expect(malformed.status).toBe(400);
    expect(mockBookingService.getById).not.toHaveBeenCalled();
  });

  it('creates a server-priced booking through the shared CRUD builder', async () => {
    const response = await createBooking(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: JSON.stringify({
          mentorId: BOOKING_ID,
          availabilitySlotId: '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
          question: 'How do I fix this?',
          acceptedTerms: true,
          termsVersionId: '00000000-0000-4000-8000-000000000001',
          termsSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          source: 'list',
          landedAt: '2026-11-05T12:00:00.000Z',
          priceMinor: 1,
          durationMinutes: 90,
        }),
      }),
      emptyContext,
    );

    expect(response.status).toBe(201);
    expect(mockBookingService.create).toHaveBeenCalledWith(
      { userId: 'seeker-id' },
      {
        mentorId: BOOKING_ID,
        availabilitySlotId: '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
        question: 'How do I fix this?',
        acceptedTerms: true,
        termsVersionId: '00000000-0000-4000-8000-000000000001',
        termsSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        source: 'list',
        landedAt: '2026-11-05T12:00:00.000Z',
      },
    );
  });

  it('delegates participant read and seeker-only reconciliation to BookingService', async () => {
    const read = await getBookingById(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}`, { headers: await memberHeaders() }),
      context,
    );
    const reconciled = await reconcilePayment(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/reconcile-payment`, {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: '{}',
      }),
      context,
    );

    expect(read.status).toBe(200);
    expect(mockBookingService.getById).toHaveBeenCalledWith({ userId: 'seeker-id' }, BOOKING_ID);
    expect(reconciled.status).toBe(200);
    expect(mockBookingService.reconcilePayment).toHaveBeenCalledWith({ userId: 'seeker-id' }, BOOKING_ID);
  });

  it('exposes mock checkout actions only through the test/development gate', async () => {
    const response = await mockPayment(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/mock-payment`, {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: JSON.stringify({ outcome: 'complete' }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockBookingService.completeMockCheckout).toHaveBeenCalledWith(
      { userId: 'seeker-id' },
      BOOKING_ID,
      'complete',
    );
  });

  it('routes mentor accept and decline actions through the authenticated action builder', async () => {
    const accept = await acceptBooking(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/accept`, {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: '{}',
      }),
      context,
    );
    const decline = await declineBooking(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/decline`, {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: '{}',
      }),
      context,
    );

    expect(accept.status).toBe(200);
    expect(mockBookingService.accept).toHaveBeenCalledWith(
      { userId: 'seeker-id' },
      BOOKING_ID,
      {},
    );
    expect(decline.status).toBe(200);
    expect(mockBookingService.decline).toHaveBeenCalledWith({ userId: 'seeker-id' }, BOOKING_ID);
  });

  it('routes operator refund requests through the action builder without exposing gateway access', async () => {
    const previous = process.env.OPERATOR_USER_IDS;
    try {
      delete process.env.OPERATOR_USER_IDS;
      const forbidden = await requestBookingRefund(
        new Request(`http://localhost/api/operator/bookings/${BOOKING_ID}/refund`, {
          method: 'POST',
          headers: mutationHeaders(await memberHeaders()),
          body: '{}',
        }),
        context,
      );
      expect(forbidden.status).toBe(403);
      expect(mockBookingService.requestRefund).not.toHaveBeenCalled();

      process.env.OPERATOR_USER_IDS = BOOKING_ID;
      const operatorCookie = `${SESSION_COOKIE}=${await signSession(BOOKING_ID, SECRET)}`;
      const response = await requestBookingRefund(
        new Request(`http://localhost/api/operator/bookings/${BOOKING_ID}/refund`, {
          method: 'POST',
          headers: mutationHeaders({ cookie: operatorCookie }),
          body: '{}',
        }),
        context,
      );

      expect(response.status).toBe(200);
      expect(mockBookingService.requestRefund).toHaveBeenCalledWith(
        { userId: BOOKING_ID },
        BOOKING_ID,
      );
    } finally {
      if (previous === undefined) delete process.env.OPERATOR_USER_IDS;
      else process.env.OPERATOR_USER_IDS = previous;
    }
  });

  it('requires CSRF and rejects malformed acceptance start times before the service call', async () => {
    const missingCsrf = await acceptBooking(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/accept`, {
        method: 'POST',
        headers: await memberHeaders(),
        body: '{}',
      }),
      context,
    );
    const invalidBody = await acceptBooking(
      new Request(`http://localhost/api/bookings/${BOOKING_ID}/accept`, {
        method: 'POST',
        headers: mutationHeaders(await memberHeaders()),
        body: '{"startsAt":"not-a-time"}',
      }),
      context,
    );

    expect(missingCsrf.status).toBe(403);
    expect(invalidBody.status).toBe(400);
    expect(mockBookingService.accept).not.toHaveBeenCalled();
  });
});
