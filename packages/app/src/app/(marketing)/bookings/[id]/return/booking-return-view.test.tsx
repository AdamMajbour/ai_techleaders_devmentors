import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import type { BookingReadDto } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { BookingReturnView } from './booking-return-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;
const pendingBooking: BookingReadDto = {
  id: 'booking-id',
  seekerId: 'seeker-id',
  mentorId: 'mentor-id',
  question: 'A private question',
  durationMinutes: 25,
  priceMinor: 2500,
  currency: 'PLN',
  status: 'pending_payment',
  source: 'link',
  landedAt: '2026-11-05T12:00:00.000Z',
  startsAt: null,
  endsAt: null,
  counterpartName: 'Ada Mentor',
  mentor: { id: 'profile-id', slug: 'ada-mentor', name: 'Ada Mentor', headline: 'Backend', technologies: 'typescript' },
  refundStatus: 'none',
  allowedActions: ['reconcile_payment'],
  serverTime: '2026-11-05T12:00:00.000Z',
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('BookingReturnView', () => {
  it('shows a clear failed-payment outcome and a retry path', async () => {
    apiCall.mockResolvedValue(success({ ...pendingBooking, status: 'payment_failed' }));
    render(<BookingReturnView bookingId="booking-id" />);

    expect(await screen.findByText('Payment did not complete. This booking was not paid. You can try again with a new question.'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to the mentor profile' })).toHaveAttribute(
      'href',
      '/m/ada-mentor?source=link',
    );
  });

  it('shows payment confirmation when the booking has been paid', async () => {
    apiCall.mockResolvedValue(success({ ...pendingBooking, status: 'paid' }));
    render(<BookingReturnView bookingId="booking-id" />);

    expect(await screen.findByText('Payment received. Your question has been sent to the mentor.')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the mentor')).toBeInTheDocument();
  });

  it('reconciles once after 60 seconds and repeats every 30 seconds', async () => {
    jest.useFakeTimers();
    apiCall.mockResolvedValue(success(pendingBooking));
    render(<BookingReturnView bookingId="booking-id" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(apiCall).toHaveBeenCalledWith('/api/bookings/booking-id');

    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    const reconciliations = () => apiCall.mock.calls.filter(([url]) => url.endsWith('/reconcile-payment'));
    expect(reconciliations()).toHaveLength(1);
    expect(reconciliations()[0]).toEqual(['/api/bookings/booking-id/reconcile-payment', {
      method: 'POST',
      json: {},
    }]);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(reconciliations()).toHaveLength(2);
  });
});
