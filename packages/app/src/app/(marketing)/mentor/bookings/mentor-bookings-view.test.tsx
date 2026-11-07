import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingPage, BookingReadDto } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { MentorBookingsView } from './mentor-bookings-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;

const paid: BookingReadDto = {
  id: 'booking-1',
  seekerId: 'seeker-1',
  mentorId: 'mentor-1',
  question: 'How do I resolve this race condition?',
  durationMinutes: 25,
  priceMinor: 2500,
  currency: 'EUR',
  status: 'paid',
  source: 'link',
  landedAt: '2026-11-05T12:00:00.000Z',
  startsAt: null,
  endsAt: null,
  counterpartName: 'Sam Seeker',
  refundStatus: 'none',
  allowedActions: ['accept', 'decline'],
  serverTime: '2026-11-05T12:00:00.000Z',
};

function page(items: BookingReadDto[], currentPage = 1, pageCount = 1): BookingPage {
  return {
    items,
    page: currentPage,
    pageSize: 10,
    total: items.length,
    pageCount,
    serverTime: paid.serverTime,
  };
}

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
});

describe('MentorBookingsView', () => {
  it('shows the question first for a paid booking and only renders available actions', async () => {
    apiCall.mockResolvedValue(success(page([paid])));
    render(<MentorBookingsView />);

    const questionHeading = await screen.findByRole('heading', { name: 'Question' });
    const status = screen.getByText('Awaiting your decision');
    expect(questionHeading.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(paid.question!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
    expect(screen.queryByText(/@example\.com/)).not.toBeInTheDocument();
  });

  it('posts accept with the server-default start and refreshes the accepted booking', async () => {
    const accepted: BookingReadDto = {
      ...paid,
      status: 'accepted',
      startsAt: '2026-11-05T12:00:00.000Z',
      endsAt: '2026-11-05T12:25:00.000Z',
      counterpartEmail: 'seeker@example.com',
      allowedActions: [],
    };
    apiCall
      .mockResolvedValueOnce(success(page([paid])))
      .mockResolvedValueOnce(success(accepted))
      .mockResolvedValueOnce(success(page([accepted])));
    render(<MentorBookingsView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(apiCall).toHaveBeenLastCalledWith('/api/bookings?role=mentor&page=1'));
    expect(apiCall).toHaveBeenNthCalledWith(
      2,
      '/api/bookings/booking-1/accept',
      { method: 'POST', json: {} },
    );
    expect(await screen.findByText(/Starts/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByText('seeker@example.com')).not.toBeInTheDocument();
  });

  it('paginates through the mentor booking list', async () => {
    apiCall
      .mockResolvedValueOnce(success(page([paid], 1, 2)))
      .mockResolvedValueOnce(success(page([], 2, 2)));
    render(<MentorBookingsView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() => expect(apiCall).toHaveBeenLastCalledWith('/api/bookings?role=mentor&page=2'));
    expect(await screen.findByText('No paid bookings yet')).toBeInTheDocument();
  });

  it('hides questions and actions for declined bookings', async () => {
    const declined = { ...paid, question: undefined, status: 'declined' as const, allowedActions: [] };
    apiCall.mockResolvedValue(success(page([declined])));
    render(<MentorBookingsView />);

    expect(await screen.findByText('Declined')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
});
