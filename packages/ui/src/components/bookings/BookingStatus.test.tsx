import { render, screen } from '@testing-library/react';
import { BookingStatus, RefundStatusLine, bookingStatusLabel, type BookingStatusValue } from './BookingStatus';

const ALL: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];

describe('BookingStatus', () => {
  it('words a paid booking from the reader’s point of view', () => {
    expect(bookingStatusLabel('paid', 'seeker').text).toBe('Waiting for the mentor');
    expect(bookingStatusLabel('paid', 'mentor').text).toBe('Awaiting your decision');
  });

  it.each(ALL)('has a text for %s for both viewers, never an empty badge', (status) => {
    expect(bookingStatusLabel(status, 'seeker').text.length).toBeGreaterThan(2);
    expect(bookingStatusLabel(status, 'mentor').text.length).toBeGreaterThan(2);
  });

  it('shows negative outcomes to the seeker as danger, and neutrally to the mentor who caused them', () => {
    expect(bookingStatusLabel('declined', 'seeker').tone).toBe('danger');
    expect(bookingStatusLabel('declined', 'mentor').tone).toBe('neutral');
  });

  it('renders the badge text', () => {
    render(<BookingStatus status="accepted" viewer="seeker" />);
    expect(screen.getByText('Accepted')).toHaveAttribute('data-tone', 'active');
  });

  it.each([
    ['pending_approval', 'Refund pending approval'],
    ['processing', 'Refund processing'],
    ['refunded', 'Refunded'],
  ] as const)('says in words where the money stands: %s', (refund, text) => {
    render(<BookingStatus status="declined" viewer="seeker" refund={refund} />);
    expect(screen.getByText(text)).toBeVisible();
  });

  it('shows no refund line when there is none', () => {
    const { container } = render(<RefundStatusLine refund="none" />);
    expect(container).toBeEmptyDOMElement();
  });
});
