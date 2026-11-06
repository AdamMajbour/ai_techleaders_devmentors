import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionPage } from './session-page';

const apiCall = jest.fn();
const usePolling = jest.fn();
jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual('@devmentor/ui');
  return { ...actual, apiCall: (...args: unknown[]) => apiCall(...args), usePolling: (...args: unknown[]) => usePolling(...args) };
});

const pageData = {
  items: [{ id: 'm1', authorId: 'seeker-id', authorName: 'Seeker', sentAt: '2026-11-06T12:10:00.000Z', text: 'A useful answer' }],
  nextCursor: 'cursor-1',
  serverTime: '2026-11-06T12:25:00.000Z',
  viewerId: 'seeker-id',
  session: { startsAt: '2026-11-06T12:00:00.000Z', endsAt: '2026-11-06T12:25:00.000Z' },
};

beforeEach(() => {
  usePolling.mockReturnValue({ status: 'success', data: pageData, terminal: false });
  apiCall.mockReset();
});

it('polls at three seconds, identifies own messages, and leaves the ended session read-only', () => {
  render(<SessionPage bookingId="booking-id" />);
  expect(usePolling).toHaveBeenCalledWith(expect.objectContaining({ intervalMs: 3000, cursor: { after: null, retry: 0 } }));
  expect(screen.getByText(/session ended at/i)).toBeInTheDocument();
  expect(screen.getByText('A useful answer').parentElement?.textContent).toContain('(you)');
  expect(screen.getByLabelText('Message')).toBeDisabled();
  expect(screen.getByText(/session has ended/i)).toBeInTheDocument();
});

it('posts through the shared API client', async () => {
  apiCall.mockResolvedValue({ ok: true, status: 200, data: { id: 'new-message', authorId: 'seeker-id', authorName: 'Seeker', sentAt: '2026-11-06T12:11:00.000Z', text: 'Thanks' } });
  usePolling.mockReturnValue({ status: 'success', data: { ...pageData, serverTime: '2026-11-06T12:10:00.000Z' }, terminal: false });
  render(<SessionPage bookingId="booking-id" />);
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Thanks' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/api/bookings/booking-id/messages', { method: 'POST', json: { body: 'Thanks' } }));
});
